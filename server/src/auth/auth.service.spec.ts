import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { hashPassword } from '../lib/password';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    staff_users: { findUnique: jest.Mock };
    students: { findUnique: jest.Mock };
  };
  let jwt: { sign: jest.Mock };

  beforeEach(async () => {
    prisma = {
      staff_users: { findUnique: jest.fn() },
      students: { findUnique: jest.fn() },
    };
    jwt = { sign: jest.fn().mockReturnValue('signed-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login (router)', () => {
    it('routes an email to loginStaff', async () => {
      const hash = await hashPassword('pw12345678');
      prisma.staff_users.findUnique.mockResolvedValue({
        staff_users_id: 1n,
        email: 'a@b.com',
        password_hash: hash,
        role: 'INSTRUCTOR',
        title: 'อ.',
        first_name: 'A',
        last_name: 'B',
        is_active: true,
      });

      const r = await service.login('a@b.com', 'pw12345678');
      expect(r.user.type).toBe('STAFF');
      expect(prisma.staff_users.findUnique).toHaveBeenCalled();
    });

    it('routes an 8-digit identifier to loginStudent', async () => {
      const hash = await hashPassword('pw12345678');
      prisma.students.findUnique.mockResolvedValue({
        student_code: '66131319',
        email: 's@x.com',
        password_hash: hash,
        title: 'นาย',
        first_name: 'S',
        last_name: 'T',
        is_active: true,
      });

      const r = await service.login('66131319', 'pw12345678');
      expect(r.user.type).toBe('STUDENT');
      expect(prisma.students.findUnique).toHaveBeenCalled();
    });

    it('rejects identifiers that are neither email nor 8-digit', async () => {
      await expect(service.login('abc123', 'pw')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('loginStaff', () => {
    const baseStaff = {
      staff_users_id: 1n,
      email: 'a@b.com',
      role: 'INSTRUCTOR',
      title: 'อ.',
      first_name: 'A',
      last_name: 'B',
      is_active: true,
    };

    it('verifies a bcrypt-hashed password', async () => {
      prisma.staff_users.findUnique.mockResolvedValue({
        ...baseStaff,
        password_hash: await hashPassword('correct1234'),
      });
      const r = await service.loginStaff('a@b.com', 'correct1234');
      expect(r.access_token).toBe('signed-token');
      expect(jwt.sign).toHaveBeenCalled();
    });

    it('verifies a legacy plain-text password (transition fallback)', async () => {
      prisma.staff_users.findUnique.mockResolvedValue({
        ...baseStaff,
        password_hash: 'legacyPlain',
      });
      const r = await service.loginStaff('a@b.com', 'legacyPlain');
      expect(r.user.email).toBe('a@b.com');
    });

    it('rejects a wrong password', async () => {
      prisma.staff_users.findUnique.mockResolvedValue({
        ...baseStaff,
        password_hash: await hashPassword('correct1234'),
      });
      await expect(
        service.loginStaff('a@b.com', 'wrong'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an unknown user', async () => {
      prisma.staff_users.findUnique.mockResolvedValue(null);
      await expect(
        service.loginStaff('ghost@b.com', 'whatever'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a deactivated account', async () => {
      prisma.staff_users.findUnique.mockResolvedValue({
        ...baseStaff,
        is_active: false,
        password_hash: await hashPassword('correct1234'),
      });
      await expect(
        service.loginStaff('a@b.com', 'correct1234'),
      ).rejects.toThrow('deactivated');
    });
  });

  describe('loginStudent', () => {
    const baseStudent = {
      student_code: '66131319',
      email: 's@x.com',
      title: 'นาย',
      first_name: 'S',
      last_name: 'T',
      is_active: true,
    };

    it('verifies a bcrypt-hashed password', async () => {
      prisma.students.findUnique.mockResolvedValue({
        ...baseStudent,
        password_hash: await hashPassword('studentPw1'),
      });
      const r = await service.loginStudent('66131319', 'studentPw1');
      expect(r.access_token).toBe('signed-token');
      expect(r.user.type).toBe('STUDENT');
    });

    it('rejects a wrong password', async () => {
      prisma.students.findUnique.mockResolvedValue({
        ...baseStudent,
        password_hash: await hashPassword('studentPw1'),
      });
      await expect(
        service.loginStudent('66131319', 'nope'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an unknown student', async () => {
      prisma.students.findUnique.mockResolvedValue(null);
      await expect(
        service.loginStudent('99999999', 'whatever'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a deactivated student', async () => {
      prisma.students.findUnique.mockResolvedValue({
        ...baseStudent,
        is_active: false,
        password_hash: await hashPassword('studentPw1'),
      });
      await expect(
        service.loginStudent('66131319', 'studentPw1'),
      ).rejects.toThrow('deactivated');
    });
  });
});
