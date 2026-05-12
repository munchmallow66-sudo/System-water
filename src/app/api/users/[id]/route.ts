import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { updateUserSchema } from '@/lib/validations';
import {
  apiSuccess,
  apiError,
  apiValidationError,
  apiUnauthorized,
  apiForbidden,
  apiNotFound
} from '@/lib/api-response';
import { getSession, isAdmin, hashPassword } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT /api/users/[id] - Update user (Admin only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    // Check authorization (Admin only)
    if (!isAdmin(session.user)) {
      return apiForbidden('Only administrators can update users');
    }

    const { id } = await params;

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return apiNotFound('User not found');
    }

    // Parse and validate request body
    const body = await request.json();
    const result = updateUserSchema.safeParse(body);

    if (!result.success) {
      return apiValidationError(result.error);
    }

    const { email, name, role, isActive, password } = result.data;

    // Check for duplicate email if changing
    if (email && email !== existingUser.email) {
      const duplicate = await db.user.findUnique({
        where: { email },
      });

      if (duplicate) {
        return apiError('Email already exists');
      }
    }

    const updateData: {
      email?: string;
      name?: string;
      role?: 'ADMIN' | 'STAFF';
      isActive?: boolean;
      password?: string;
    } = {};

    if (email) updateData.email = email;
    if (name) updateData.name = name;
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) updateData.password = await hashPassword(password);

    // Update user
    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    // Log audit
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entity: 'User',
        entityId: user.id,
        details: JSON.stringify({ email, name, role, isActive }),
      },
    });

    return apiSuccess(user);
  } catch (error) {
    console.error('Update user error:', error);
    return apiError('Failed to update user');
  }
}

// DELETE /api/users/[id] - Delete user (Admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    // Check authorization (Admin only)
    if (!isAdmin(session.user)) {
      return apiForbidden('Only administrators can delete users');
    }

    const { id } = await params;

    // Prevent self-deletion
    if (id === session.user.id) {
      return apiError('Cannot delete your own account');
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: { meterReadings: true, payments: true },
        },
      },
    });

    if (!existingUser) {
      return apiNotFound('User not found');
    }

    // Check if user has related data
    if (existingUser._count.meterReadings > 0 || existingUser._count.payments > 0) {
      return apiError('Cannot delete user with existing meter readings or payments. Deactivate instead.');
    }

    // No session model in db, skip session deletion

    // Delete user
    await db.user.delete({
      where: { id },
    });

    // Log audit
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        entity: 'User',
        entityId: id,
        details: JSON.stringify({ email: existingUser.email, name: existingUser.name }),
      },
    });

    return apiSuccess({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return apiError('Failed to delete user');
  }
}
