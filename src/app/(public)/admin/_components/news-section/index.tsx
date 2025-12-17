"use client";

import React, { useContext } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ServerContext } from "@/lib/server-context";

const newsArticles = [
  {
    id: "article1",
    title: "Vivamus Pulvinar Ut Nunc Eu Gravida Suspendisse Quis Diam Felis",
    excerpt:
      "Cras interdum urna sollicitudin nulla edipscing. A porttitor accusan eget felis semper integer mattis pretium.",
    date: "23 Nov, 2023",
    imageUrl: "/placeholder-article1.jpg",
  },
  {
    id: "article2",
    title: "Vivamus Pulvinar Ut Nunc Eu Gravida Suspendisse Quis Diam Felis",
    excerpt:
      "Cras interdum urna sollicitudin nulla edipscing. A porttitor accusan eget felis semper integer mattis pretium.",
    date: "23 Nov, 2023",
    imageUrl: "/placeholder-article2.jpg",
  },
  {
    id: "article3",
    title: "Vivamus Pulvinar Ut Nunc Eu Gravida Suspendisse Quis Diam Felis",
    excerpt:
      "Cras interdum urna sollicitudin nulla edipscing. A porttitor accusan eget felis semper integer mattis pretium.",
    date: "23 Nov, 2023",
    imageUrl: "/placeholder-article3.jpg",
  },
];

export default function NewsSection() {
  const { theme } = useContext(ServerContext);

  return (
    <section className="py-16 bg-[color:var(--color-surface)]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[color:var(--color-text)] mb-4 font-heading">
            Latest News & Articles
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {newsArticles.map((article) => (
            <div
              key={article.id}
              className="flex flex-col bg-[color:var(--color-surface)] overflow-hidden"
            >
              {/* Article Image */}
              <div className="relative h-48 bg-[color:var(--color-primary)]/10 overflow-hidden">
                {/* This would be replaced with actual article image */}
                <div className="absolute inset-0 bg-[color:var(--color-primary)]/10"></div>
              </div>

              <div className="p-4">
                <h3 className="text-base font-semibold mb-2 line-clamp-2 font-heading text-[color:var(--color-text)]">
                  {article.title}
                </h3>
                <p className="text-sm text-[color:var(--color-text-dimmed)] mb-4 line-clamp-3 font-body">
                  {article.excerpt}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[color:var(--color-text-dimmed)]">
                    {article.date}
                  </span>
                  <Link href={`/blog/${article.id}`}>
                    <span className="text-sm font-medium text-[color:var(--color-primary)] hover:underline">
                      Read Article
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
