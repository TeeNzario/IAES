import { NextRequest, NextResponse } from 'next/server';

interface User {
    id: string;
    name: string;
    role: 'STUDENT' | 'TEACHER' | 'SUPERVISOR' | 'ADMIN';
    active: 'ACTIVE' | 'INACTIVE';
}

// Mock database
let users: User[] = [
    { id: '66131319', name: 'TERAPAT JONG.JIT', role: 'STUDENT', active: 'ACTIVE' },
    { id: '66131320', name: 'JOHN DOE', role: 'TEACHER', active: 'ACTIVE' },
    { id: '66131321', name: 'JANE SMITH', role: 'SUPERVISOR', active: 'ACTIVE' },
    { id: '66131322', name: 'ALICE JOHNSON', role: 'STUDENT', active: 'ACTIVE' },
    { id: '66131323', name: 'BOB WILSON', role: 'ADMIN', active: 'INACTIVE' },
];

// GET /api/users - Get all users with filters
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '9');
        const search = searchParams.get('search') || '';
        const role = searchParams.get('role') || '';

        let filtered = users;

        // Filter by search term
        if (search) {
            filtered = filtered.filter(user =>
                user.name.toLowerCase().includes(search.toLowerCase()) ||
                user.id.includes(search)
            );
        }

        // Filter by role
        if (role) {
            filtered = filtered.filter(user => user.role === role.toUpperCase());
        }

        // Pagination
        const total = filtered.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const paginatedUsers = filtered.slice(startIndex, startIndex + limit);

        return NextResponse.json({
            data: paginatedUsers,
            total,
            page,
            limit,
            totalPages,
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: 'Failed to fetch users' },
            { status: 500 }
        );
    }
}

// POST /api/users - Create new user
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, role, active } = body;

        if (!name || !role) {
            return NextResponse.json(
                { error: 'Name and role are required' },
                { status: 400 }
            );
        }

        const newUser: User = {
            id: Date.now().toString(),
            name,
            role,
            active: active || 'ACTIVE',
        };

        users.push(newUser);

        return NextResponse.json(newUser, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: 'Failed to create user' },
            { status: 500 }
        );
    }
}