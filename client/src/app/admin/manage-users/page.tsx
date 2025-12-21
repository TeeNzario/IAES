"use client"

import NavBar from "@/components/layout/NavBar";
import { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

interface User {
    id: string;
    name: string;
    role: string;
    active: string;
}

export default function ManageUserPage() {
    const [users, setUsers] = useState<User[]>([
        { id: '66131319', name: 'TERAPAT JONG.JIT', role: 'STUDENT', active: 'ACTIVE' },
        { id: '66131319', name: 'TERAPAT JONG.JIT', role: 'STUDENT', active: 'ACTIVE' },
        { id: '66131319', name: 'TERAPAT JONG.JIT', role: 'STUDENT', active: 'ACTIVE' },
        { id: '66131319', name: 'TERAPAT JONG.JIT', role: 'STUDENT', active: 'ACTIVE' },
        { id: '66131319', name: 'TERAPAT JONG.JIT', role: 'STUDENT', active: 'ACTIVE' },
        { id: '66131319', name: 'TERAPAT JONG.JIT', role: 'STUDENT', active: 'ACTIVE' },
        { id: '66131319', name: 'TERAPAT JONG.JIT', role: 'STUDENT', active: 'ACTIVE' },
        { id: '66131319', name: 'TERAPAT JONG.JIT', role: 'STUDENT', active: 'ACTIVE' },
        { id: '66131319', name: 'TERAPAT JONG.JIT', role: 'STUDENT', active: 'ACTIVE' },
    ]);

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [activeFilter, setActiveFilter] = useState('all');
    const itemsPerPage = 9;

    const filteredUsers = useMemo(() => {
        return users.filter(user =>
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.id.includes(searchTerm)
        );
    }, [users, searchTerm]);

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <NavBar>
            <div className="p-8 bg-gray-50 min-h-screen w-full">
                <h1 className="text-3xl font-bold mb-8 text-gray-800">จัดการข้อมูลผู้ใช้</h1>

                {/* Filter and Search Bar */}
                <div className="flex justify-between items-center mb-6">
                    {/* Filter Buttons */}
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setActiveFilter('all')}
                            className={`px-6 py-2 rounded-full font-semibold transition-colors ${
                                activeFilter === 'all' 
                                    ? 'bg-purple-300 text-white' 
                                    : 'border-2 border-purple-300 text-gray-700 hover:bg-purple-50'
                            }`}
                        >
                            ทั้งหมด
                        </button>
                        <button 
                            onClick={() => setActiveFilter('supervisor')}
                            className={`px-6 py-2 rounded-full font-semibold transition-colors ${
                                activeFilter === 'supervisor' 
                                    ? 'bg-purple-300 text-white' 
                                    : 'border-2 border-purple-300 text-gray-700 hover:bg-purple-50'
                            }`}
                        >
                            นิเทศน์
                        </button>
                        <button 
                            onClick={() => setActiveFilter('teacher')}
                            className={`px-6 py-2 rounded-full font-semibold transition-colors ${
                                activeFilter === 'teacher' 
                                    ? 'bg-purple-300 text-white' 
                                    : 'border-2 border-purple-300 text-gray-700 hover:bg-purple-50'
                            }`}
                        >
                            อาจารย์
                        </button>
                        <button 
                            onClick={() => setActiveFilter('admin')}
                            className={`px-6 py-2 rounded-full font-semibold transition-colors ${
                                activeFilter === 'admin' 
                                    ? 'bg-purple-300 text-white' 
                                    : 'border-2 border-purple-300 text-gray-700 hover:bg-purple-50'
                            }`}
                        >
                            ผู้ดูแล
                        </button>
                        <button className="px-6 py-2 border-2 border-purple-300 text-gray-700 rounded-full hover:bg-purple-50">
                            <Filter size={20} />
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-64">
                        <input
                            type="text"
                            placeholder="SEARCH"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-400"
                        />
                        <Search className="absolute right-3 top-2.5 text-gray-400" size={20} />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden w-full">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-purple-300 text-white">
                                <th className="px-6 py-4 text-left font-semibold">ID</th>
                                <th className="px-6 py-4 text-left font-semibold">NAME</th>
                                <th className="px-6 py-4 text-left font-semibold">ROLE</th>
                                <th className="px-6 py-4 text-left font-semibold">ACTIVE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedUsers.map((user, index) => (
                                <tr key={index} className="border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 text-gray-700">{user.id}</td>
                                    <td className="px-6 py-4 text-gray-700">{user.name}</td>
                                    <td className="px-6 py-4 text-gray-700">{user.role}</td>
                                    <td className="px-6 py-4 text-gray-700">{user.active}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex justify-center items-center gap-2 mt-8">
                    <button className="p-2 hover:bg-gray-200 rounded-lg disabled:opacity-50" disabled={currentPage === 1}>
                        <ChevronLeft size={20} />
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => (
                        <button
                            key={i + 1}
                            onClick={() => setCurrentPage(i + 1)}
                            className={`w-8 h-8 rounded-lg font-semibold ${
                                currentPage === i + 1
                                    ? 'bg-purple-300 text-white'
                                    : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            {i + 1}
                        </button>
                    ))}
                    <span className="text-gray-500">...</span>
                    <button className="w-8 h-8 rounded-lg border border-gray-300 font-semibold hover:bg-gray-100">{totalPages}</button>
                    <button className="p-2 hover:bg-gray-200 rounded-lg disabled:opacity-50" disabled={currentPage === totalPages}>
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        </NavBar>
    );
}