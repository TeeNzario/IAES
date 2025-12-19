import React, { useState } from 'react';
import { Menu, Home, FileText, BookOpen, ChevronDown, Plus, User } from 'lucide-react';

type PageLayoutProps = {
  children: React.ReactNode;
};

const NavBar = ({ children }: PageLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isReportsExpanded, setIsReportsExpanded] = useState(true);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-white shadow-lg`}>
        <div className="p-4">
          {/* Burger Button */}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 mb-4 hover:bg-gray-100 rounded-lg transition-colors w-full flex justify-start"
          >
            <Menu size={24} className="text-gray-700" />
          </button>

          {/* Home Button */}
          <button className={`w-full flex items-center gap-3 ${isSidebarOpen ? 'px-4 py-3 rounded-full' : 'p-3 rounded-lg justify-center'} bg-[#B7A3E3] text-white mb-4 hover:bg-purple-400 transition-colors`}>
            <Home size={20} />
            {isSidebarOpen && <span className="font-medium">หน้าแรก</span>}
          </button>

          {/* Reports Section */}
          <div className="mb-4">
            <button 
              onClick={() => setIsReportsExpanded(!isReportsExpanded)}
              className={`w-full flex items-center ${isSidebarOpen ? 'justify-between px-4' : 'justify-center'} py-3 text-[#575757] hover:bg-gray-100 rounded-lg transition-colors`}
            >
              <div className="flex items-center gap-3">
                <FileText size={20} />
                {isSidebarOpen && <span>รายวิชา</span>}
              </div>
              {isSidebarOpen && (
                <ChevronDown 
                  size={16} 
                  className={`transition-transform ${isReportsExpanded ? 'rotate-180' : ''} text-[#575757]`}
                />
              )}
            </button>
            
            {/* Dropdown Items */}
            {isReportsExpanded && isSidebarOpen && (
              <div className="ml-4 mt-2 space-y-1">
                <button className="w-full text-left px-4 py-2 text-[#575757] hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors">
                  COE64-145
                </button>
                <button className="w-full text-left px-4 py-2 text-[#575757] hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors">
                  COE64-132
                </button>
                <button className="w-full text-left px-4 py-2 text-[#575757] hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors">
                  GEN64-555
                </button>
              </div>
            )}
          </div>

          {/* Results Section */}
          <button className={`w-full flex items-center gap-3 ${isSidebarOpen ? 'px-4' : 'justify-center'} py-3 text-[#575757] hover:bg-gray-100 rounded-lg transition-colors`}>
            <BookOpen size={20} />
            {isSidebarOpen && <span>ผลสรุปการสอน</span>}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Navigation Bar */}
        <nav className="bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            {/* Left Section */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#B7A3E3] rounded-full flex items-center justify-center">
                </div>
                <span className="text-xl font-light text-gray-800">IAES System</span>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-4">
              {/* <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-lg">
                <img 
                  src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 60 30'%3E%3Crect width='60' height='30' fill='%23ED1C24'/%3E%3Crect y='10' width='60' height='10' fill='%23FFFFFF'/%3E%3Crect y='20' width='60' height='10' fill='%232E3192'/%3E%3C/svg%3E"
                  alt="Thai flag"
                  className="w-5 h-4"
                />
                <span className="text-sm text-gray-700">ไทย</span>
              </div> */}

              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Plus size={24} className="text-[#B7A3E3]" />
              </button>

              <button className="w-10 h-10 bg-[#B7A3E3] rounded-full flex items-center justify-center hover:bg-purple-400 transition-colors">
                <User size={20} className="text-[#B7A3E3]" />
              </button>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="flex-1 p-8 overflow-auto">
          <div className="max-w-4xl">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavBar;