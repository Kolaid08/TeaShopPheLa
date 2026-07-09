const fs = require('fs');

const path = 'd:/Project/wow/apps/customer/src/app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add imports
content = content.replace(
  "import { toast } from 'sonner';\n\nconst removeAccents",
  "import { toast } from 'sonner';\nimport dynamic from 'next/dynamic';\nimport AddressAutocomplete from '@/components/AddressAutocomplete';\n\nconst MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });\n\nconst removeAccents"
);

// 2. Add states
content = content.replace(
  "const [paymentMethod, setPaymentMethod] = useState<'COD' | 'QR_CODE'>('COD');\n  \n  // PayOS states",
  "const [paymentMethod, setPaymentMethod] = useState<'COD' | 'QR_CODE'>('COD');\n  \n  // Delivery states\n  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'>('TAKEAWAY');\n  const [latitude, setLatitude] = useState<number | null>(null);\n  const [longitude, setLongitude] = useState<number | null>(null);\n  const [receiverName, setReceiverName] = useState('');\n  const [receiverPhone, setReceiverPhone] = useState('');\n  const [calculatedShippingFee, setCalculatedShippingFee] = useState<number>(0);\n  const [isMapModalOpen, setIsMapModalOpen] = useState(false);\n  \n  // PayOS states"
);

// 3. Update get total price to include shipping fee
content = content.replace(
  "const getTotalPrice = () => getSubtotal() - getDiscountAmount();",
  "const getTotalPrice = () => getSubtotal() - getDiscountAmount() + (orderType === 'DELIVERY' ? calculatedShippingFee : 0);"
);

// 4. Update handlePlaceOrder payload
content = content.replace(
  "ShopTableID: tableId > 0 ? tableId : undefined,\n        OrderNote: `${deliveryAddress ? `Giao hàng: ${deliveryAddress}` : ''}${orderNote ? ` | Ghi chú: ${orderNote}` : ''}`,",
  "ShopTableID: orderType === 'DINE_IN' && tableId > 0 ? tableId : undefined,\n        OrderNote: orderNote,\n        OrderType: orderType,\n        ShippingAddress: orderType === 'DELIVERY' ? deliveryAddress : undefined,\n        Latitude: orderType === 'DELIVERY' ? latitude : undefined,\n        Longitude: orderType === 'DELIVERY' ? longitude : undefined,\n        ReceiverName: orderType === 'DELIVERY' ? receiverName : undefined,\n        ReceiverPhone: orderType === 'DELIVERY' ? receiverPhone : undefined,\n        ShippingFee: orderType === 'DELIVERY' ? calculatedShippingFee : 0,"
);

// 5. Replace form
content = content.replace(
  `                  {tableId === 0 && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wide">Địa chỉ giao hàng *</label>
                      <Input 
                        placeholder="Nhập địa chỉ nhà, văn phòng..." 
                        value={deliveryAddress}
                        onChange={(e)=>setDeliveryAddress(e.target.value)}
                        className="text-xs h-8"
                      />
                    </div>
                  )}`,
  `                  {/* Order Type Selection */}
                  <div className="flex bg-muted p-1 rounded-xl gap-1">
                    <button onClick={() => setOrderType('TAKEAWAY')} className={\`flex-1 text-xs py-2 rounded-lg font-bold transition-all \${orderType === 'TAKEAWAY' ? 'bg-background shadow text-primary' : 'text-muted-foreground'}\`}>Mang đi</button>
                    <button onClick={() => setOrderType('DINE_IN')} className={\`flex-1 text-xs py-2 rounded-lg font-bold transition-all \${orderType === 'DINE_IN' ? 'bg-background shadow text-primary' : 'text-muted-foreground'}\`}>Tại bàn</button>
                    <button onClick={() => setOrderType('DELIVERY')} className={\`flex-1 text-xs py-2 rounded-lg font-bold transition-all \${orderType === 'DELIVERY' ? 'bg-background shadow text-primary' : 'text-muted-foreground'}\`}>Giao hàng</button>
                  </div>

                  {orderType === 'DINE_IN' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground block mb-1 uppercase tracking-wide">Số bàn (Tại quầy)</label>
                      <select 
                        value={tableId}
                        onChange={(e)=>setTableId(parseInt(e.target.value))}
                        className="w-full rounded-lg border border-border bg-background p-2 text-xs"
                      >
                        <option value={0}>Chọn bàn...</option>
                        {tables.map(t => (
                          <option key={t.ShopTableID} value={t.ShopTableID}>Bàn {t.ShopTableNumber}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {orderType === 'DELIVERY' && (
                    <div className="space-y-3 p-3 bg-muted/30 rounded-xl border border-border/50">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wide">Gợi ý địa chỉ giao hàng *</label>
                        <AddressAutocomplete 
                          initialValue={deliveryAddress}
                          onAddressSelect={(address, lat, lng) => {
                            setDeliveryAddress(address);
                            setLatitude(lat);
                            setLongitude(lng);
                            // calculate random fee
                            setCalculatedShippingFee(Math.floor(Math.random() * 20 + 15) * 1000);
                          }}
                          onOpenMap={() => setIsMapModalOpen(true)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wide">Tên người nhận</label>
                          <Input 
                            placeholder={customer?.CustomerName || ''}
                            value={receiverName}
                            onChange={(e)=>setReceiverName(e.target.value)}
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wide">SĐT liên hệ</label>
                          <Input 
                            placeholder={customer?.PhoneNumber || ''}
                            value={receiverPhone}
                            onChange={(e)=>setReceiverPhone(e.target.value)}
                            className="text-xs h-8"
                          />
                        </div>
                      </div>
                    </div>
                  )}`
);

// 6. Update Validation in Checkout button
content = content.replace(
  `                    if (tableId === 0 && !deliveryAddress) {
                      toast.error('Vui lòng cung cấp địa chỉ giao hàng.');
                      return;
                    }`,
  `                    if (orderType === 'DINE_IN' && tableId === 0) {
                      toast.error('Vui lòng chọn số bàn.');
                      return;
                    }
                    if (orderType === 'DELIVERY' && (!deliveryAddress || !latitude || !longitude)) {
                      toast.error('Vui lòng chọn toạ độ trên bản đồ và điền chi tiết địa chỉ.');
                      return;
                    }`
);

// 7. Add shipping fee to Subtotal display
content = content.replace(
  `                  <div className="flex justify-between text-base font-bold text-foreground pt-1 border-t border-border/30">
                    <span>Tổng thanh toán</span>`,
  `                  {orderType === 'DELIVERY' && calculatedShippingFee > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Phí giao hàng</span>
                      <span className="font-mono">+{calculatedShippingFee.toLocaleString('vi-VN')} đ</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-foreground pt-1 border-t border-border/30">
                    <span>Tổng thanh toán</span>`
);

// 8. Add Map Modal before closing tag
content = content.replace(
  "    </div>\n  );\n}",
  `      {/* C. Map Modal */}
      <Dialog 
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        title="Chọn địa chỉ trên bản đồ"
      >
        <div className="space-y-4">
          <MapPicker 
            onLocationSelect={(lat, lng) => {
              setLatitude(lat);
              setLongitude(lng);
            }} 
            defaultLat={latitude || 10.762622}
            defaultLng={longitude || 106.660172}
          />
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">Chi tiết số nhà, đường (Tùy chọn ghi thêm):</label>
            <Input 
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="VD: 155 Lê Quý Đôn..."
            />
          </div>
          <Button 
            className="w-full mt-4" 
            onClick={() => {
              if (!latitude || !longitude) {
                toast.error('Vui lòng chọn vị trí trên bản đồ');
                return;
              }
              setCalculatedShippingFee(Math.floor(Math.random() * 20 + 15) * 1000);
              setIsMapModalOpen(false);
            }}
          >
            Xác nhận vị trí này
          </Button>
        </div>
      </Dialog>
    </div>
  );
}`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully patched page.tsx');
