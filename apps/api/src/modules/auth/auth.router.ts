import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { config } from '../../config/index';
import { sendResponse } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

const loginSchema = z.object({
  PINCode: z.string().min(4).max(10),
  password: z.string().min(6),
});

// POST /login
router.post('/login', async (req, res, next) => {
  try {
    const { PINCode, password } = loginSchema.parse(req.body);

    const employee = await prisma.employee.findFirst({
      where: { PINCode },
      include: { Role: true },
    });

    if (!employee) {
      throw new AppError(401, 'Invalid PIN Code or password.');
    }

    const isMatch = await bcrypt.compare(password, employee.password);
    if (!isMatch) {
      throw new AppError(401, 'Invalid PIN Code or password.');
    }

    const tokenPayload = {
      EmployeeID: employee.EmployeeID,
      Email: employee.Email,
      RoleName: employee.Role.RoleName,
    };

    const accessToken = jwt.sign(tokenPayload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiry as any,
    });

    const refreshToken = jwt.sign(tokenPayload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiry as any,
    });

    // Store refresh token in HttpOnly secure cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Also send accessToken in cookie for convenient browser usage
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    return sendResponse(res, 200, true, 'Login successful', {
      accessToken,
      employee: {
        EmployeeID: employee.EmployeeID,
        FullName: employee.FullName,
        Role: employee.Role.RoleName,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new AppError(401, 'Refresh token missing.');
    }

    let payload: any;
    try {
      payload = jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch {
      throw new AppError(403, 'Invalid or expired refresh token.');
    }

    const tokenPayload = {
      EmployeeID: payload.EmployeeID,
      Email: payload.Email,
      RoleName: payload.RoleName,
    };

    const newAccessToken = jwt.sign(tokenPayload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiry as any,
    });

    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    });

    return sendResponse(res, 200, true, 'Token refreshed successfully', {
      accessToken: newAccessToken,
    });
  } catch (err) {
    next(err);
  }
});

// POST /logout
router.post('/logout', (_req, res, next) => {
  try {
    res.clearCookie('refreshToken');
    res.clearCookie('accessToken');
    return sendResponse(res, 200, true, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
});

export default router;
