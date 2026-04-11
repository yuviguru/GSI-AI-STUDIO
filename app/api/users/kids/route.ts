import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { verifyAuth } from '@/lib/auth-utils';
import { createKid, listKids } from '@/lib/firebase/kidService';

/**
 * POST /api/users/kids
 * Add a kid profile to the authenticated parent's account.
 * Max 4 kids per parent.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);

    const body = await request.json();
    const { name, email, avatar, age, grade, board } = body;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length < 1) {
      throw new AppException('INVALID_INPUT', 'Kid name is required', 400);
    }
    if (name.trim().length > 30) {
      throw new AppException('INVALID_INPUT', 'Name must be 30 characters or less', 400);
    }

    // Validate email
    if (!email || typeof email !== 'string') {
      throw new AppException('INVALID_INPUT', 'Email is required for kid profile', 400);
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new AppException('INVALID_INPUT', 'Please enter a valid email address', 400);
    }

    // Validate age (optional, but if provided must be 8-17)
    if (age !== undefined) {
      if (typeof age !== 'number' || age < 8 || age > 17) {
        throw new AppException('INVALID_INPUT', 'Age must be between 8 and 17', 400);
      }
    }

    // Validate grade (optional)
    if (grade !== undefined) {
      const validGrades = ['3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
      if (!validGrades.includes(grade)) {
        throw new AppException('INVALID_INPUT', 'Grade must be between 3 and 12', 400);
      }
    }

    // Validate board (optional)
    if (board !== undefined) {
      const validBoards = ['cbse', 'icse', 'state'];
      if (!validBoards.includes(board)) {
        throw new AppException('INVALID_INPUT', 'Board must be cbse, icse, or state', 400);
      }
    }

    const kid = await createKid(auth.userId, {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      avatar,
      age,
      grade,
      board,
    });

    return apiSuccess(
      {
        id: kid.id,
        name: kid.name,
        email: kid.email,
        avatar: kid.avatar,
        age: kid.age,
        grade: kid.grade,
        board: kid.board,
        aiPoints: kid.aiPoints,
        badges: kid.badges,
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET /api/users/kids
 * List all kid profiles for the authenticated parent.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);

    const kids = await listKids(auth.userId);

    return apiSuccess(
      kids.map((kid) => ({
        id: kid.id,
        name: kid.name,
        avatar: kid.avatar,
        age: kid.age,
        grade: kid.grade,
        board: kid.board,
        aiPoints: kid.aiPoints,
        badges: kid.badges,
        totalCreations: kid.totalCreations,
        creationsByType: kid.creationsByType ?? {},
        conceptsLearned: kid.conceptsLearned ?? [],
        streak: kid.streak,
      }))
    );
  } catch (error) {
    return handleApiError(error);
  }
}
