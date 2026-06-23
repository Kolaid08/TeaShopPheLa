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

const SYSTEM_INSTRUCTION_TEMPLATE = `Bạn là nhân viên chăm sóc khách hàng trực tuyến của quán trà sữa Phêla. 
Nhiệm vụ của bạn là hỗ trợ khách hàng, giải đáp thắc mắc về menu, giờ mở cửa, và kiểm tra đơn hàng.
GIỌNG ĐIỆU: Lịch sự, thân thiện, dạ vâng, xưng em và gọi khách là anh/chị.
QUY TẮC NGHIÊM NGẶT:
1. KHÔNG BAO GIỜ trả lời các câu hỏi không liên quan đến quán trà sữa Phêla, đồ uống, đơn hàng hoặc dịch vụ của quán.
2. Nếu khách hỏi ngoài lề (ví dụ: toán học, lập trình, thuật toán, tin tức, lịch sử), hãy từ chối lịch sự và lái câu chuyện về Phêla.
3. Nếu khách yêu cầu gặp nhân viên thật, gặp quản lý, hoặc bạn KHÔNG THỂ trả lời được câu hỏi (do quá phức tạp hoặc khách đang khiếu nại gay gắt), hãy phản hồi với một câu xin lỗi và thêm chính xác cụm từ này vào CUỐI câu trả lời của bạn: [HANDOFF_TO_HUMAN]. Bắt buộc phải có cụm ngoặc vuông này.
4. Thông tin cơ bản: Quán mở cửa từ 8h sáng đến 10h tối. Menu của quán hiện tại gồm có: {{DYNAMIC_MENU}}. Tuyệt đối không tự bịa ra các món không có trong danh sách này.`;

export const generateAIResponse = async (messages: { sender: string; text: string }[], newMessage: string) => {
  if (!apiKey) {
    return "Hệ thống AI hiện đang bảo trì (thiếu API Key). Vui lòng thử lại sau hoặc yêu cầu gặp nhân viên. [HANDOFF_TO_HUMAN]";
  }

  // Fetch dynamic menu from DB
  let menuStr = '';
  try {
    const activeDrinks = await prisma.drink.findMany({
      where: { DrinkStatus: 'ACTIVE' },
      select: { DrinkName: true }
    });
    menuStr = activeDrinks.map(d => d.DrinkName).join(', ');
  } catch (error) {
    console.error('Failed to fetch menu for AI:', error);
  }

  const systemInstruction = SYSTEM_INSTRUCTION_TEMPLATE.replace('{{DYNAMIC_MENU}}', menuStr || 'Đang cập nhật');

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: systemInstruction,
    tools: [{ functionDeclarations: [checkOrderStatusDeclaration] }],
  });

  // Create a text transcript of the chat history to avoid Gemini's strict alternating history crashes
  let transcript = messages.map(m => `${m.sender === 'CUSTOMER' ? 'Khách hàng' : 'Phêla AI'}: ${m.text}`).join('\n');
  if (transcript) {
    transcript = `Lịch sử trò chuyện:\n${transcript}\n\n`;
  }
  
  const prompt = `${transcript}Khách hàng vừa gửi tin nhắn mới: "${newMessage}"\nHãy phản hồi lại tin nhắn mới nhất này một cách tự nhiên nhất theo đúng ngữ cảnh lịch sử phía trên.`;

  const chat = model.startChat(); // start an empty chat just for function calling capabilities easily
  
  let result;
  try {
    result = await chat.sendMessage(prompt);
  } catch (error: any) {
    console.error("Gemini API Error:", error.message);
    throw error;
  }
  
  let response = result.response;

  // Handle function calling
  const functionCalls = response.functionCalls();
  if (functionCalls && functionCalls.length > 0) {
    const call = functionCalls[0];
    if (call.name === 'check_order_status') {
      const orderId = (call.args as any).orderId;
      try {
        const order = await prisma.orders.findUnique({
          where: { OrderID: Number(orderId) },
        });
        
        let apiResponse = {};
        if (order) {
          apiResponse = { status: order.OrderStatus, totalPrice: Number(order.TotalPrice) };
        } else {
          apiResponse = { error: 'Không tìm thấy đơn hàng với mã này.' };
        }

        // Send function response back to Gemini
        result = await chat.sendMessage([{
          functionResponse: {
            name: 'check_order_status',
            response: apiResponse
          }
        }]);
        response = result.response;
      } catch (err) {
        result = await chat.sendMessage([{
          functionResponse: {
            name: 'check_order_status',
            response: { error: 'Lỗi hệ thống khi tra cứu đơn hàng.' }
          }
        }]);
        response = result.response;
      }
    }
  }

  return response.text();
};
