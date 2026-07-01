import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { prisma } from '../../utils/prisma';
import { config } from '../../config';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

// Tool for checking order status
const checkOrderStatusDeclaration: FunctionDeclaration = {
  name: 'check_order_status',
  description: 'Kiểm tra trạng thái đơn hàng và tổng tiền dựa vào ID đơn hàng (OrderID).',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      orderId: {
        type: SchemaType.NUMBER,
        description: 'Mã đơn hàng (OrderID) cần kiểm tra',
      },
    },
    required: ['orderId'],
  },
};

const generateVoucherDeclaration: FunctionDeclaration = {
  name: 'generate_voucher',
  description: 'Sinh mã giảm giá (voucher) tặng khách hàng để kích cầu hoặc xoa dịu. Chỉ gọi khi muốn tặng mã giảm giá cho khách.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {},
  },
};

const SYSTEM_INSTRUCTION_TEMPLATE = `Bạn là nhân viên bán hàng xuất sắc của quán trà sữa Phêla. 
Nhiệm vụ của bạn là hỗ trợ khách hàng, tư vấn menu, kiểm tra đơn hàng, và CHỐT SALE.
GIỌNG ĐIỆU: Lịch sự, thân thiện, dạ vâng, xưng em và gọi khách là anh/chị.
QUY TẮC NGHIÊM NGẶT:
1. KHÔNG trả lời các câu hỏi ngoài lề (toán học, lập trình, tin tức).
2. Nếu không thể trả lời, hãy xin lỗi và thêm [HANDOFF_TO_HUMAN] vào cuối câu.
3. Thông tin: Mở cửa 8h-22h. Menu: {{DYNAMIC_MENU}}. Không bịa món.
4. QUAN TRỌNG: Bạn có quyền TẶNG MÃ GIẢM GIÁ. Hãy dùng công cụ generate_voucher để xin hệ thống 1 mã giảm giá. Nếu hệ thống trả về mã giảm giá thành công (có code, drinkId, và drinkName), bạn PHẢI nhắc đến đúng tên món đó (drinkName) trong câu trả lời và chèn chính xác cú pháp [BUY_NOW:CODE:DRINK_ID] vào cuối câu trả lời để hiển thị nút áp dụng cho khách. Thay CODE và DRINK_ID bằng dữ liệu thật hệ thống trả về.
5. Tình trạng khách hàng: {{LOGIN_STATUS}}. Nếu khách Đã đăng nhập và đang trò chuyện, BẠN PHẢI CHỦ ĐỘNG GỌI LUÔN công cụ generate_voucher để phát mã cho khách nhằm chốt sale nhanh, KHÔNG cần đợi khách xin.
Ví dụ: "Dạ em thấy trong giỏ hàng của anh/chị đang có món Trà Dâu Kem Phô Mai (L), em gửi anh chị mã giảm giá 10% để chốt đơn luôn nhé ạ [BUY_NOW:PHELA123:4]"`;

export const generateAIResponse = async (messages: { sender: string; text: string }[], newMessage: string, customerId?: number | null) => {
  if (!apiKey) {
    return "Hệ thống AI hiện đang bảo trì (thiếu API Key). Vui lòng thử lại sau hoặc yêu cầu gặp nhân viên. [HANDOFF_TO_HUMAN]";
  }

  let menuStr = '';
  try {
    const activeDrinks = await prisma.drink.findMany({
      where: { DrinkStatus: 'ACTIVE' },
      select: { DrinkName: true }
    });
    menuStr = activeDrinks.map(d => d.DrinkName).join(', ');
  } catch (error) {
    console.error('Failed to fetch menu:', error);
  }

  let loginStatus = customerId ? 'Đã đăng nhập (Bạn có quyền tặng voucher ngay)' : 'Chưa đăng nhập (Khuyên khách đăng nhập để nhận voucher)';
  const systemInstruction = SYSTEM_INSTRUCTION_TEMPLATE
    .replace('{{DYNAMIC_MENU}}', menuStr || 'Đang cập nhật')
    .replace('{{LOGIN_STATUS}}', loginStatus);

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: systemInstruction,
    tools: [{ functionDeclarations: [checkOrderStatusDeclaration, generateVoucherDeclaration] }],
  });

  let transcript = messages.map(m => `${m.sender === 'CUSTOMER' ? 'Khách hàng' : 'Phêla AI'}: ${m.text}`).join('\n');
  if (transcript) {
    transcript = `Lịch sử trò chuyện:\n${transcript}\n\n`;
  }
  
  const prompt = `${transcript}Khách hàng vừa gửi tin nhắn mới: "${newMessage}"\nHãy phản hồi lại tin nhắn mới nhất này một cách tự nhiên nhất theo đúng ngữ cảnh lịch sử phía trên.`;

  const chat = model.startChat();
  
  let result;
  try {
    result = await chat.sendMessage(prompt);
  } catch (error: any) {
    console.error("Gemini API Error:", error.message);
    throw error;
  }
  
  let response = result.response;
  let functionCalls = response.functionCalls();

  // Loop to handle potential sequence of function calls
  while (functionCalls && functionCalls.length > 0) {
    const call = functionCalls[0]!;
    let apiResponse = {};
    
    if (call.name === 'check_order_status') {
      const orderId = (call.args as any).orderId;
      try {
        const order = await prisma.orders.findUnique({ where: { OrderID: Number(orderId) } });
        if (order) apiResponse = { status: order.OrderStatus, totalPrice: Number(order.TotalPrice) };
        else apiResponse = { error: 'Không tìm thấy đơn hàng.' };
      } catch {
        apiResponse = { error: 'Lỗi hệ thống khi tra cứu đơn hàng.' };
      }
    } else if (call.name === 'generate_voucher') {
      if (!customerId) {
        apiResponse = { error: 'Khách hàng chưa đăng nhập, không thể tặng mã giảm giá.' };
      } else {
        // Thuật toán sinh Voucher
        try {
          const completedOrdersCount = await prisma.orders.count({
            where: { CustomerID: customerId, OrderStatus: 'COMPLETED' }
          });
          
          if (completedOrdersCount >= 1) {
            // Check if already received AI voucher this month
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0,0,0,0);
            
            const existingAIVoucher = await prisma.voucher.findFirst({
              where: {
                OwnerID: customerId,
                Creator: 'AI',
                createdAt: { gte: startOfMonth }
              }
            });

            if (existingAIVoucher) {
              apiResponse = { error: 'Khách hàng đã nhận mã giảm giá từ AI trong tháng này, không thể tặng thêm.' };
            } else {
              const customer = await prisma.customer.findUnique({
                where: { CustomerID: customerId },
                include: { MemberShipLevel: true }
              });

              if (!customer) {
                apiResponse = { error: 'Không tìm thấy thông tin khách hàng.' };
                break;
              }

              // Count AI vouchers issued this month
              const aiVouchersThisMonth = await prisma.voucher.findMany({
                where: { Creator: 'AI', createdAt: { gte: startOfMonth } },
                include: { Customer: true }
              });

              let rankedCount = 0;
              let unrankedCount = 0;
              
              for (const v of aiVouchersThisMonth) {
                if (v.Customer && v.Customer.LevelID > 1) {
                  rankedCount++;
                } else {
                  unrankedCount++;
                }
              }

              const isRanked = customer.LevelID > 1;

              if (isRanked && rankedCount >= 6) {
                apiResponse = { error: 'Rất tiếc, số lượng mã giảm giá tháng này dành cho Hội viên thân thiết đã hết.' };
              } else if (!isRanked && unrankedCount >= 4) {
                apiResponse = { error: 'Rất tiếc, số lượng mã giảm giá ngẫu nhiên tháng này đã hết.' };
              } else {
                const baseDiscount = customer.MemberShipLevel?.DiscountRate || 0;
                const discountValue = 10; // "luôn giảm 10%" theo feedback mới nhất
                
                // Fetch the customer's active cart
                const activeCart = await prisma.cart.findFirst({
                  where: { CustomerID: customerId, Status: 'ACTIVE' },
                  orderBy: { updatedAt: 'desc' },
                  include: { 
                    CartItems: { 
                      include: { DrinkSize: { include: { Drink: true } } } 
                    } 
                  }
                });

                if (!activeCart || activeCart.CartItems.length === 0) {
                  apiResponse = { error: 'Dạ giỏ hàng của anh/chị hiện đang trống. Anh/chị vui lòng chọn một vài món yêu thích vào giỏ hàng trước, sau đó em sẽ xem xét tặng mã giảm giá đặc biệt cho mình nhé!' };
                } else {
                  const code = `PHELA-AI-${Math.random().toString(36).substring(2,8).toUpperCase()}`;
                  
                  // Target the first item in the cart
                  const targetItem = activeCart.CartItems[0]!;
                  
                  await prisma.voucher.create({
                    data: {
                      Code: code,
                      DiscountType: 'PERCENT',
                      DiscountValue: discountValue,
                      TargetProductID: targetItem.DrinkSizeID,
                      OwnerID: customerId,
                      Creator: 'AI',
                      ValidUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
                    }
                  });
                  
                  apiResponse = { 
                    success: true, 
                    voucherCode: code, 
                    discount: `${discountValue}%`,
                    drinkId: targetItem.DrinkSizeID,
                    drinkName: targetItem.DrinkSize.Drink.DrinkName
                  };
                }
              }
            }
          } else {
            apiResponse = { error: 'Khách hàng chưa có đơn hàng hoàn thành nào, không đủ điều kiện nhận mã.' };
          }
        } catch (err: any) {
          apiResponse = { error: 'Lỗi hệ thống khi tạo mã giảm giá: ' + err.message };
        }
      }
    }

    try {
      result = await chat.sendMessage([{
        functionResponse: { name: call!.name, response: apiResponse }
      }]);
      response = result.response;
      functionCalls = response.functionCalls();
    } catch (err) {
      console.error('Gemini Tool Response Error:', err);
      break;
    }
  }

  return response.text() || 'Dạ hệ thống AI đang gặp chút sự cố khi tạo mã, anh/chị thông cảm đợi em một lát hoặc thử lại sau nhé.';
};
