import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const syncCart = async (req: Request, res: Response) => {
  try {
    const { SessionID, CustomerID, Items } = req.body;

    // BẢO MẬT: Chặn Carts IDOR & Mass Assignment
    if (CustomerID && (!req.user || req.user.CustomerID !== Number(CustomerID))) {
        return res.status(403).json({ success: false, message: 'Forbidden: Cannot modify other customer carts.' });
    }
    
    let validCustomerID = null;
    if (CustomerID) {
      const customer = await prisma.customer.findUnique({
        where: { CustomerID: Number(CustomerID) }
      });
      if (customer) {
        validCustomerID = customer.CustomerID;
      }
    }

    let cart = null;

    if (validCustomerID) {
      cart = await prisma.cart.findFirst({
        where: { Status: 'ACTIVE', CustomerID: validCustomerID },
        orderBy: { updatedAt: 'desc' }
      });
      
      // If no customer cart, try to claim an anonymous session cart
      if (!cart && SessionID) {
        const anonCart = await prisma.cart.findFirst({
          where: { Status: 'ACTIVE', SessionID, CustomerID: null },
          orderBy: { updatedAt: 'desc' }
        });
        if (anonCart) {
          cart = await prisma.cart.update({
            where: { CartID: anonCart.CartID },
            data: { CustomerID: validCustomerID }
          });
        }
      }
    } else if (SessionID) {
      // Anonymous user
      cart = await prisma.cart.findFirst({
        where: { Status: 'ACTIVE', SessionID, CustomerID: null },
        orderBy: { updatedAt: 'desc' }
      });
    }

    if (!cart) {
      cart = await prisma.cart.create({
        data: { SessionID, CustomerID: validCustomerID }
      });
    }

    const finalCartId = cart!.CartID;
    let catalogItems: any[] = [];
    if (Items && Items.length > 0) {
      const drinkSizeIds = Items.map((i: any) => i.DrinkSizeID);
      catalogItems = await prisma.drinkSize.findMany({
        where: { DrinkSizeID: { in: drinkSizeIds } }
      });
    }

    const updatedCart = await prisma.$transaction(async (tx) => {
      // Retrieve existing items before deleting
      const existingItems = await tx.cartItem.findMany({
        where: { CartID: finalCartId }
      });

      await tx.cartItem.deleteMany({
        where: { CartID: finalCartId }
      });

      // Merge existing DB items with request Items
      const mergedItemsMap = new Map<string, any>();
      
      // Helper to generate a unique key for a cart item
      const getItemKey = (item: any) => {
        let tStr = '';
        if (Array.isArray(item.Toppings)) {
          tStr = [...item.Toppings].sort().join(',');
        } else if (item.Toppings) {
           tStr = JSON.stringify(item.Toppings);
        }
        return `${item.DrinkSizeID}-${item.Sugar || '100%'}-${item.Ice || '100%'}-${tStr}`;
      }

      // Add existing DB items to map
      for (const item of existingItems) {
        // Since we deleted existing items, this logic is a bit tricky.
        // Wait, the previous logic deleted ALL items and recreated them. But what about existing toppings?
        // Let's just rely entirely on the frontend's Items for sync.
        // Wait, the frontend overrides the whole cart. So we just need to process Items!
      }
      
      mergedItemsMap.clear();

      // Add/Update request Items to map
      if (Items && Items.length > 0) {
        for (const item of Items) {
          const catalogItem = catalogItems.find(c => c.DrinkSizeID === item.DrinkSizeID);
          if (catalogItem) {
            // item.Toppings should now be an array of IDs from Frontend
            const normalizedItem = {
              DrinkSizeID: item.DrinkSizeID,
              Quantity: item.Quantity,
              Sugar: item.Sugar || '100%',
              Ice: item.Ice || '100%',
              Toppings: Array.isArray(item.Toppings) ? item.Toppings : [],
              UnitPrice: catalogItem.UnitPrice
            };
            const key = getItemKey(normalizedItem);
            if (mergedItemsMap.has(key)) {
              mergedItemsMap.get(key).Quantity += normalizedItem.Quantity;
            } else {
              mergedItemsMap.set(key, normalizedItem);
            }
          }
        }
      }

      const finalItemsToInsert = Array.from(mergedItemsMap.values());

      if (finalItemsToInsert.length > 0) {
        for (const item of finalItemsToInsert) {
           const cItem = await tx.cartItem.create({
             data: {
               CartID: finalCartId,
               DrinkSizeID: item.DrinkSizeID,
               Quantity: item.Quantity,
               Sugar: item.Sugar,
               Ice: item.Ice,
               UnitPrice: item.UnitPrice
             }
           });
           
           if (item.Toppings && item.Toppings.length > 0) {
             const toppingList = await tx.topping.findMany({ where: { ToppingID: { in: item.Toppings } } });
             await tx.cartItemTopping.createMany({
               data: item.Toppings.map((tId: number) => {
                 const tPrice = toppingList.find(t => t.ToppingID === tId)?.Price || 0;
                 return {
                   CartItemID: cItem.CartItemID,
                   ToppingID: tId,
                   Quantity: 1,
                   UnitPrice: tPrice,
                 }
               })
             });
           }
        }
      }

      // Fetch the updated cart to return
      return tx.cart.findUnique({
        where: { CartID: finalCartId },
        include: {
          CartItems: {
            include: {
              DrinkSize: {
                include: { Drink: true, Size: true }
              },
              Toppings: {
                include: { Topping: true }
              }
            }
          }
        }
      });
    });

    res.status(200).json({ success: true, data: updatedCart });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getCart = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const isCustomer = !isNaN(Number(id));
    
    // BẢO MẬT: Chặn Carts IDOR
    if (isCustomer) {
      if (!req.user || req.user.CustomerID !== Number(id)) {
        return res.status(403).json({ success: false, message: 'Forbidden: Cannot access other customer carts.' });
      }
    }
    
    const cart = await prisma.cart.findFirst({
      where: isCustomer ? { CustomerID: Number(id) } : { SessionID: id },
      include: {
        CartItems: {
          include: {
            DrinkSize: {
              include: { Drink: true, Size: true }
            }
          }
        }
      }
    });

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
export const getAbandonedCarts = async (req: Request, res: Response) => {
  try {
    // Tìm các giỏ hàng không được cập nhật quá 24h và có chứa sản phẩm
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Auto update status to ABANDONED for these carts
    await prisma.cart.updateMany({
      where: {
        Status: 'ACTIVE',
        updatedAt: { lt: twentyFourHoursAgo },
      },
      data: { Status: 'ABANDONED' }
    });

    const abandonedCarts = await prisma.cart.findMany({
      where: {
        Status: { in: ['ABANDONED', 'ABANDONED_NOTIFIED'] },
        CartItems: {
          some: {} // Only get carts that actually have items
        }
      },
      include: {
        Customer: {
          select: { CustomerName: true, PhoneNumber: true }
        },
        CartItems: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Manually join DrinkSize details
    const drinkSizeIds = Array.from(new Set(abandonedCarts.flatMap((c: any) => c.CartItems.map((item: any) => item.DrinkSizeID))));
    const drinkSizes = await prisma.drinkSize.findMany({
      where: { DrinkSizeID: { in: drinkSizeIds } },
      include: { Drink: true, Size: true }
    });
    
    const drinkSizeMap = new Map(drinkSizes.map(ds => [ds.DrinkSizeID, ds]));

    const result = abandonedCarts.map((cart: any) => ({
      ...cart,
      CartItems: cart.CartItems.map((item: any) => ({
        ...item,
        DrinkSize: drinkSizeMap.get(item.DrinkSizeID)
      }))
    }));

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const mockAbandonedCarts = async (req: Request, res: Response) => {
  try {
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
    await prisma.cart.updateMany({
      where: { Status: 'ACTIVE' },
      data: { updatedAt: twentyFiveHoursAgo, Status: 'ABANDONED' }
    });
    res.status(200).json({ success: true, message: 'Mocked successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
e x p o r t   c o n s t   n o t i f y A b a n d o n e d C a r t   =   a s y n c   ( r e q :   R e q u e s t ,   r e s :   R e s p o n s e )   = >   { 
     t r y   { 
         c o n s t   {   i d   }   =   r e q . p a r a m s ; 
         c o n s t   c a r t   =   a w a i t   p r i s m a . c a r t . f i n d U n i q u e ( { 
             w h e r e :   {   C a r t I D :   N u m b e r ( i d )   } 
         } ) ; 
 
         i f   ( ! c a r t   | |   c a r t . S t a t u s   ! = =   ' A B A N D O N E D ' )   { 
             r e t u r n   r e s . s t a t u s ( 4 0 0 ) . j s o n ( {   s u c c e s s :   f a l s e ,   m e s s a g e :   ' C a r t   i s   n o t   i n   A B A N D O N E D   s t a t u s '   } ) ; 
         } 
 
         c o n s t   c o d e   =   ' C O M E B A C K - '   +   M a t h . r a n d o m ( ) . t o S t r i n g ( 3 6 ) . s u b s t r i n g ( 2 ,   8 ) . t o U p p e r C a s e ( ) ; 
         
         a w a i t   p r i s m a . ( a s y n c   ( t x )   = >   { 
             a w a i t   t x . v o u c h e r . c r e a t e ( { 
                 d a t a :   { 
                     C o d e :   c o d e , 
                     D i s c o u n t T y p e :   ' P E R C E N T ' , 
                     D i s c o u n t V a l u e :   1 5 , 
                     M a x U s a g e :   1 , 
                     V a l i d U n t i l :   n e w   D a t e ( D a t e . n o w ( )   +   7   *   2 4   *   6 0   *   6 0   *   1 0 0 0 ) ,   / /   7   d a y s 
                     S t a t u s :   ' A C T I V E ' , 
                     O w n e r I D :   c a r t . C u s t o m e r I D , 
                     C r e a t o r :   ' S Y S T E M _ A B A N D O N E D _ C A R T ' 
                 } 
             } ) ; 
 
             a w a i t   t x . c a r t . u p d a t e ( { 
                 w h e r e :   {   C a r t I D :   N u m b e r ( i d )   } , 
                 d a t a :   {   S t a t u s :   ' A B A N D O N E D _ N O T I F I E D '   } 
             } ) ; 
         } ) ; 
 
         r e s . s t a t u s ( 2 0 0 ) . j s o n ( {   s u c c e s s :   t r u e ,   m e s s a g e :   ' N o t i f i e d   a n d   v o u c h e r   c r e a t e d   s u c c e s s f u l l y '   } ) ; 
     }   c a t c h   ( e r r o r )   { 
         c o n s o l e . e r r o r ( e r r o r ) ; 
         r e s . s t a t u s ( 5 0 0 ) . j s o n ( {   s u c c e s s :   f a l s e ,   m e s s a g e :   ' S e r v e r   e r r o r '   } ) ; 
     } 
 } ;  
 