"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const menuItems = [
  { name: "Home", path: "/" },
  { name: "Run Review", path: "/review" },
  {
    name: "Dashboard",
    path: "/dashboard",
    submenu: [
      { name: "Pending", path: "/dashboard/pending" },
      { name: "Completed", path: "/dashboard/completed" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [expandedMenu, setExpandedMenu] = useState<string | null>("Dashboard");

  const toggleSubmenu = (menuName: string) => {
    setExpandedMenu(expandedMenu === menuName ? null : menuName);
  };

  return (
    <div className="h-screen w-64 bg-[#202123] text-white flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <div className="text-xl font-semibold">AI Assistant</div>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {menuItems.map((item) => (
          <div key={item.name}>
            {item.submenu ? (
              <div>
                <button
                  onClick={() => toggleSubmenu(item.name)}
                  className={`w-full text-left px-3 py-2 rounded-md mb-1 text-sm hover:bg-gray-700/50 transition-colors ${
                    pathname.startsWith(item.path) ? "bg-gray-700/50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{item.name}</span>
                    <span className="text-xs">
                      {expandedMenu === item.name ? "▼" : "▶"}
                    </span>
                  </div>
                </button>
                {expandedMenu === item.name && (
                  <div className="ml-4">
                    {item.submenu.map((subItem) => (
                      <Link
                        key={subItem.name}
                        href={subItem.path}
                        className={`block px-3 py-2 rounded-md mb-1 text-sm hover:bg-gray-700/50 transition-colors ${
                          pathname === subItem.path ? "bg-gray-700/50" : ""
                        }`}
                      >
                        {subItem.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                href={item.path}
                className={`block px-3 py-2 rounded-md mb-1 text-sm hover:bg-gray-700/50 transition-colors ${
                  pathname === item.path ? "bg-gray-700/50" : ""
                }`}
              >
                {item.name}
              </Link>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}
