import { Request, Response } from 'express';
import { sendResponse } from '../../utils/response';
import { getSessionById, getAdminSessions } from './chat.service';

export const getSessionHistory = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = await getSessionById(sessionId);
    if (!session) {
      return sendResponse(res, 404, false, 'Session not found');
    }
    return sendResponse(res, 200, true, 'Success', session);
  } catch (error) {
    return sendResponse(res, 500, false, 'Internal server error');
  }
};

export const getSessionsForAdmin = async (req: Request, res: Response) => {
  try {
    const sessions = await getAdminSessions();
    return sendResponse(res, 200, true, 'Success', sessions);
  } catch (error) {
    return sendResponse(res, 500, false, 'Internal server error');
  }
};
