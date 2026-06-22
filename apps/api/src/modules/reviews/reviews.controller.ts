import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getReviews = async (req: Request, res: Response) => {
  try {
    const { drinkId } = req.params;
    const reviews = await prisma.review.findMany({
      where: { DrinkID: Number(drinkId) },
      include: {
        Customer: {
          select: { CustomerName: true, LevelID: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createReview = async (req: Request, res: Response) => {
  try {
    const { CustomerID, DrinkID, OrderID, Rating, Comment } = req.body;

    const hasBought = await prisma.orderDetail.findFirst({
      where: {
        OrderID: Number(OrderID),
        DrinkSize: { DrinkID: Number(DrinkID) },
        Orders: {
          CustomerID: Number(CustomerID)
        }
      }
    });

    if (!hasBought) {
      return res.status(403).json({ success: false, message: 'Chỉ khách hàng đã mua sản phẩm mới được đánh giá.' });
    }

    // Check if they already reviewed this drink in this order
    const existingReview = await prisma.review.findFirst({
      where: {
        OrderID: Number(OrderID),
        DrinkID: Number(DrinkID)
      }
    });

    if (existingReview) {
      return res.status(400).json({ success: false, message: 'Bạn đã đánh giá món này trong đơn hàng này rồi.' });
    }

    const review = await prisma.review.create({
      data: {
        CustomerID: Number(CustomerID),
        DrinkID: Number(DrinkID),
        OrderID: Number(OrderID),
        Rating: Number(Rating),
        Comment
      }
    });

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
