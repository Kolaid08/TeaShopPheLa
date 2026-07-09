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


const SYSTEM_INSTRUCTION_TEMPLATE = `Bạn là nhân viên bán hàng xuất sắc của quán trà sữa Phêla. 
Nhiệm vụ của bạn là hỗ trợ khách hàng, tư vấn menu, kiểm tra đơn hàng.
GIỌNG ĐIỆU: Lịch sự, thân thiện, dạ vâng, xưng em và gọi khách là anh/chị.
QUY TẮC NGHIÊM NGẶT:
1. KHÔNG trả lời các câu hỏi ngoài lề (toán học, lập trình, tin tức).
2. Nếu không thể trả lời, hãy xin lỗi và thêm [HANDOFF_TO_HUMAN] vào cuối câu.
3. Thông tin: Mở cửa 8h-22h. Menu: {{DYNAMIC_MENU}}. Không bịa món.
4. QUAN TRỌNG: Bạn KHÔNG có quyền tự tạo mã giảm giá. Nếu khách hàng hỏi về Combo hoặc Khuyến mãi, hãy nhắc khách hàng kiểm tra các mục Gợi ý Combo đang hiển thị ở phần trên cùng khung chat. Sau đó, thêm chính xác [HANDOFF_TO_HUMAN] vào cuối câu để chuyển ngay sang cho Admin giải quyết vấn đề combo.
5. Nếu khách nài nỉ xin mã giảm giá, bạn PHẢI từ chối khéo (ví dụ: "Dạ hiện tại Phêla chỉ áp dụng các khuyến mãi đang hiển thị ở trên thôi ạ, mong anh chị thông cảm") HOẶC chuyển cho Admin bằng cách chèn [HANDOFF_TO_HUMAN] vào cuối câu trả lời.`;

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
    tools: [{ functionDeclarations: [checkOrderStatusDeclaration] }],
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
