"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const menuItems = [
  { name: "Chat", path: "/" },
  { name: "Run Review", path: "/review" },
];

const dashboardTabs = [
  { name: "Completed", path: "/dashboard/completed" },
];

export default function NavBar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-[#202123] text-white relative sticky top-0 z-50">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center h-16">
          {/* Mobile menu button */}
          <div className="md:hidden w-1/3 flex justify-start pt-5">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="relative w-8 h-8 focus:outline-none group"
            >
              <div className="relative w-6 h-6">
                <span
                  className={`absolute h-0.5 w-6 bg-white transform transition-all duration-300 ease-in-out ${
                    isMenuOpen ? "rotate-45 translate-y-0" : "-translate-y-2"
                  }`}
                />
                <span
                  className={`absolute h-0.5 w-6 bg-white transform transition-all duration-300 ease-in-out ${
                    isMenuOpen ? "opacity-0" : "opacity-100"
                  }`}
                />
                <span
                  className={`absolute h-0.5 w-6 bg-white transform transition-all duration-300 ease-in-out ${
                    isMenuOpen ? "-rotate-45 translate-y-0" : "translate-y-2"
                  }`}
                />
              </div>
            </button>
          </div>

          {/* Logo - centered on mobile, left on desktop */}
          <div className="md:flex-none md:w-32 text-center md:text-left w-1/3">
            <Link href={"/"}>
              <div className="text-xl font-semibold">PG-Agent</div>
              <div className="text-xs text-gray-400">Beta Version</div>
            </Link>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex flex-1 items-center justify-center space-x-8">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                href={item.path}
                className={`px-3 py-2 text-sm hover:bg-gray-700/50 rounded-md transition-colors ${
                  pathname === item.path ? "bg-gray-700/50" : ""
                }`}
              >
                {item.name}
              </Link>
            ))}
            <div className="flex items-center space-x-1">
              {dashboardTabs.map((tab) => (
                <Link
                  key={tab.name}
                  href={tab.path}
                  className={`px-3 py-2 text-sm rounded-md transition-colors ${
                    pathname === tab.path
                      ? "bg-gray-700/50"
                      : "hover:bg-gray-700/50"
                  }`}
                >
                  {tab.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Desktop login button */}
          <div className="hidden md:flex items-center ml-8">
            <button className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm font-medium">
              Login
            </button>
          </div>

          {/* Mobile trial status */}
          <div className="md:hidden w-1/3 flex justify-end">
            <span className="text-sm text-gray-400">On Trial</span>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden fixed inset-0 bg-[#202123] z-50">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <div className="text-xl font-semibold">PG-Agen</div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="relative w-8 h-8 focus:outline-none group"
                >
                  <div className="relative w-6 h-6">
                    <span className="absolute h-0.5 w-6 bg-white transform rotate-45 translate-y-0" />
                    <span className="absolute h-0.5 w-6 bg-white transform -rotate-45 translate-y-0" />
                  </div>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {menuItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.path}
                    className={`block px-4 py-3 text-sm hover:bg-gray-700/50 rounded-md transition-colors text-center ${
                      pathname === item.path ? "bg-gray-700/50" : ""
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
                <div className="border-t border-gray-700 my-4"></div>
                {dashboardTabs.map((tab) => (
                  <Link
                    key={tab.name}
                    href={tab.path}
                    className={`block px-4 py-3 text-sm hover:bg-gray-700/50 rounded-md transition-colors text-center ${
                      pathname === tab.path ? "bg-gray-700/50" : ""
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {tab.name}
                  </Link>
                ))}
              </div>
              <div className="p-6 border-t border-gray-700">
                <button className="w-full px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm font-medium">
                  Login
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
