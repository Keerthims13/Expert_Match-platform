import { Router } from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { expertRepository } from '../repositories/expertRepository.js';

const router = Router();

router.use(requireAuth);

router.post('/experts/:expertId/bookmark', async (req, res, next) => {
  try {
    const expertId = Number(req.params.expertId);
    if (!Number.isInteger(expertId) || expertId <= 0) {
      return res.status(400).json({ message: 'Invalid expert ID' });
    }

    const result = await expertRepository.toggleBookmark(req.user.id, expertId);
    res.status(200).json({
      message: result.bookmarked ? 'Expert bookmarked' : 'Bookmark removed',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

router.get('/bookmarks', async (req, res, next) => {
  try {
    const bookmarks = await expertRepository.getUserBookmarks(req.user.id);
    res.status(200).json({
      message: 'Bookmarks fetched successfully',
      data: bookmarks
    });
  } catch (error) {
    next(error);
  }
});

export default router;
