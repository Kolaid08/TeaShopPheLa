import axios from 'axios';
import { AppError } from '../../middleware/errorHandler';

const GHN_API_URL = process.env.GHN_API_URL || 'https://dev-online-gateway.ghn.vn/shiip/public-api';
const GHN_TOKEN = process.env.GHN_TOKEN || '';
const GHN_SHOP_ID = process.env.GHN_SHOP_ID || '';

const ghnClient = axios.create({
  baseURL: GHN_API_URL,
  headers: {
    'Content-Type': 'application/json',
    Token: GHN_TOKEN,
  },
});

export const GhnService = {
  // Lấy danh sách Tỉnh/Thành
  async getProvinces() {
    try {
      const res = await ghnClient.get('/master-data/province');
      return res.data.data;
    } catch (error: any) {
      console.error('GHN getProvinces Error:', error.response?.data || error.message);
      throw new AppError(500, 'Không thể lấy danh sách Tỉnh/Thành từ hệ thống vận chuyển.');
    }
  },

  // Lấy danh sách Quận/Huyện theo ProvinceID
  async getDistricts(province_id: number) {
    try {
      const res = await ghnClient.get('/master-data/district', { params: { province_id } });
      return res.data.data;
    } catch (error: any) {
      console.error('GHN getDistricts Error:', error.response?.data || error.message);
      throw new AppError(500, 'Không thể lấy danh sách Quận/Huyện từ hệ thống vận chuyển.');
    }
  },

  // Lấy danh sách Phường/Xã theo DistrictID
  async getWards(district_id: number) {
    try {
      const res = await ghnClient.get('/master-data/ward', { params: { district_id } });
      return res.data.data;
    } catch (error: any) {
      console.error('GHN getWards Error:', error.response?.data || error.message);
      throw new AppError(500, 'Không thể lấy danh sách Phường/Xã từ hệ thống vận chuyển.');
    }
  },

  // Tính phí vận chuyển dự kiến
  async calculateFee(payload: {
    to_district_id: number;
    to_ward_code: string;
    weight: number; // Tổng khối lượng (gram)
    insurance_value: number; // Tổng giá trị đơn hàng
  }) {
    try {
      const res = await ghnClient.post(
        '/v2/shipping-order/fee',
        {
          service_type_id: 2, // 2: E-commerce Delivery (chuẩn)
          to_district_id: payload.to_district_id,
          to_ward_code: payload.to_ward_code,
          weight: payload.weight,
          insurance_value: payload.insurance_value,
        },
        {
          headers: { ShopId: GHN_SHOP_ID },
        }
      );
      return res.data.data.total; // Trả về tổng phí ship
    } catch (error: any) {
      console.error('GHN calculateFee Error:', error.response?.data || error.message);
      throw new AppError(500, 'Không thể tính phí vận chuyển từ hệ thống GHN.');
    }
  },

  // Tạo đơn giao hàng mới lên hệ thống GHN
  async createOrder(payload: {
    to_name: string;
    to_phone: string;
    to_address: string;
    to_ward_code: string;
    to_district_id: number;
    weight: number;
    insurance_value: number;
    cod_amount: number;
    content: string;
    items: Array<{ name: string; quantity: number; price: number; weight: number }>;
  }) {
    try {
      const res = await ghnClient.post(
        '/v2/shipping-order/create',
        {
          payment_type_id: 1, // 1: Người bán trả phí ship, 2: Người mua trả phí ship (Ở đây thu tiền ship trên web rồi nên shop trả GHN)
          note: 'Cho xem hàng, không thử',
          required_note: 'CHOXEMHANGKHONGTHU',
          return_phone: '0901234567',
          return_address: 'Cửa hàng Phê La',
          return_district_id: 1442, // Quận mặc định của shop (VD: Quận 1)
          return_ward_code: '20102', // Phường mặc định
          client_order_code: '', // Có thể chèn OrderID của Phê La
          to_name: payload.to_name,
          to_phone: payload.to_phone,
          to_address: payload.to_address,
          to_ward_code: payload.to_ward_code,
          to_district_id: payload.to_district_id,
          cod_amount: payload.cod_amount,
          content: payload.content,
          weight: payload.weight,
          length: 20, // Kích thước đóng gói dự kiến (cm)
          width: 20,
          height: 20,
          insurance_value: payload.insurance_value,
          service_type_id: 2,
          items: payload.items,
        },
        {
          headers: { ShopId: GHN_SHOP_ID },
        }
      );
      return res.data.data.order_code; // Mã vận đơn của GHN
    } catch (error: any) {
      console.error('GHN createOrder Error:', JSON.stringify(error.response?.data) || error.message);
      throw new AppError(500, 'Có lỗi xảy ra khi đồng bộ đơn hàng sang hệ thống vận chuyển GHN.');
    }
  },
};
