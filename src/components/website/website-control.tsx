"use client";

import { useQuery } from "@tanstack/react-query";
import { Globe, Eye, TrendingUp, FileText, RefreshCw, ExternalLink, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const PAGES = [
  { id: "home", title: "Bosh sahifa", slug: "/", views: 1243, lastUpdated: "2026-06-20" },
  { id: "about", title: "Biz haqimizda", slug: "/about", views: 432, lastUpdated: "2026-06-18" },
  { id: "products", title: "Mahsulotlar", slug: "/products", views: 876, lastUpdated: "2026-06-22" },
  { id: "contact", title: "Aloqa", slug: "/contact", views: 321, lastUpdated: "2026-06-15" },
];

const BLOG_POSTS = [
  { id: "1", title: "Tibbiy paxta ishlab chiqarish texnologiyasi", status: "published", views: 234 },
  { id: "2", title: "Bandaj turlarining afzalliklari", status: "draft", views: 0 },
  { id: "3", title: "Sifat nazorati bo'yicha standartlar", status: "published", views: 189 },
];

export function WebsiteControl() {
  const [isPublishing, setIsPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  const handlePublish = async () => {
    setIsPublishing(true);
    await new Promise(r => setTimeout(r, 2000));
    setIsPublishing(false);
    setPublished(true);
    setTimeout(() => setPublished(false), 3000);
  };

  const totalViews = PAGES.reduce((s, p) => s + p.views, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: Globe, label: "Sahifalar soni", value: String(PAGES.length), color: "text-blue-400", bg: "bg-blue-900/20" },
          { icon: Eye, label: "Umumiy ko'rishlar", value: totalViews.toLocaleString(), color: "text-indigo-400", bg: "bg-indigo-900/20" },
          { icon: FileText, label: "Blog postlari", value: String(BLOG_POSTS.length), color: "text-purple-400", bg: "bg-purple-900/20" },
          { icon: TrendingUp, label: "Bu oy", value: "+12%", color: "text-green-400", bg: "bg-green-900/20" },
        ].map(stat => (
          <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <p className="text-slate-400 text-xs">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium">Sahifalar</h3>
            <Button size="sm" variant="outline" className="border-slate-700 text-slate-400 gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" /> Ko'rish
            </Button>
          </div>
          <div className="space-y-2">
            {PAGES.map(page => (
              <div key={page.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div>
                  <p className="text-white text-sm">{page.title}</p>
                  <p className="text-slate-500 text-xs font-mono">{page.slug}</p>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm">{page.views.toLocaleString()}</p>
                  <p className="text-slate-500 text-xs">ko'rishlar</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium">Blog postlari</h3>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
              + Yangi post
            </Button>
          </div>
          <div className="space-y-2 mb-4">
            {BLOG_POSTS.map(post => (
              <div key={post.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{post.title}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${post.status === "published" ? "text-green-400 bg-green-900/20" : "text-slate-500 bg-slate-800"}`}>
                    {post.status === "published" ? "Chop etilgan" : "Qoralama"}
                  </span>
                </div>
                {post.views > 0 && <p className="text-slate-400 text-xs ml-2">{post.views} ko'rish</p>}
              </div>
            ))}
          </div>

          <div className="border-t border-slate-800 pt-4">
            <Button onClick={handlePublish} disabled={isPublishing}
              className="w-full bg-green-700 hover:bg-green-600 text-white">
              {published ? (
                <><CheckCircle className="h-4 w-4 mr-2" /> Chop etildi!</>
              ) : isPublishing ? (
                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Chop etilmoqda...</>
              ) : (
                <><Globe className="h-4 w-4 mr-2" /> Saytga chop etish</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
