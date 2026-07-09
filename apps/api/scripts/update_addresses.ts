import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { prisma } from '../src/utils/prisma';
import { GhnService } from '../src/modules/shipping/ghn.service';

async function main() {
  console.log('Fetching orders with PENDING or SHIPPING status...');
  const orders = await prisma.orders.findMany({
    where: {
      OrderStatus: { in: ['PENDING', 'SHIPPING'] },
      ProvinceID: { not: null },
      DistrictID: { not: null },
      WardCode: { not: null },
    },
  });

  console.log(`Found ${orders.length} orders to check.`);

  // Cache GHN data to avoid redundant API calls
  const provinces = await GhnService.getProvinces();
  const districtMap = new Map<number, any[]>();
  const wardMap = new Map<number, any[]>();

  for (const order of orders) {
    try {
      // Check if address already contains the province name (simple heuristic)
      const provinceName = provinces.find((p: any) => p.ProvinceID === order.ProvinceID)?.ProvinceName;
      if (!provinceName) continue;

      if (order.ShippingAddress?.includes(provinceName)) {
        console.log(`Order ${order.OrderID} already has full address. Skipping.`);
        continue;
      }

      let districts = districtMap.get(order.ProvinceID!);
      if (!districts) {
        districts = await GhnService.getDistricts(order.ProvinceID!);
        districtMap.set(order.ProvinceID!, districts || []);
      }
      const districtName = districts?.find((d: any) => d.DistrictID === order.DistrictID)?.DistrictName;

      let wards = wardMap.get(order.DistrictID!);
      if (!wards) {
        wards = await GhnService.getWards(order.DistrictID!);
        wardMap.set(order.DistrictID!, wards || []);
      }
      const wardName = wards?.find((w: any) => w.WardCode === order.WardCode)?.WardName;

      const fullAddress = [order.ShippingAddress, wardName, districtName, provinceName].filter(Boolean).join(', ');

      await prisma.orders.update({
        where: { OrderID: order.OrderID },
        data: { ShippingAddress: fullAddress },
      });

      console.log(`Updated Order ${order.OrderID} with address: ${fullAddress}`);
    } catch (error: any) {
      console.error(`Failed to update Order ${order.OrderID}:`, error.message);
    }
  }

  console.log('Update script completed.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
