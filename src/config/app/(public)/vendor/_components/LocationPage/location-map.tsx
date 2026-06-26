"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { VenueLocation } from "@/types/api.types";
import { LocationData } from "@/types/theme.types";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";

interface LocationMapProps {
  locations: (VenueLocation | LocationData)[];
  onSelect: (slug: string) => void;
}

interface LocationNode {
  name: string;
  slug: string;
  x: number;
  y: number;
  eventCount: number;
}

export default function LocationMap({ locations, onSelect }: LocationMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  // Convert locations to map nodes with coordinates
  const locationNodes: LocationNode[] = locations.map((location, idx) => {
    const name =
      "city" in location && location.city
        ? location.city
        : "name" in location && location.name
        ? location.name
        : "Unknown";

    const slug = "slug" in location && location.slug ? location.slug : "";

    // Distribute locations in a visually appealing pattern
    const angle = (idx / locations.length) * 2 * Math.PI;
    const radius = Math.min(dimensions.width, dimensions.height) * 0.3;
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    return {
      name,
      slug,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      eventCount: 0, // Could be fetched from API
    };
  });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current) {
        const container = svgRef.current.parentElement;
        if (container) {
          setDimensions({
            width: container.clientWidth,
            height: Math.min(container.clientWidth * 0.6, 500),
          });
        }
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Render D3 visualization
  useEffect(() => {
    if (!svgRef.current || locationNodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    // Create main group
    const g = svg.append("g").attr("transform", `translate(0,0)`);

    // Draw connecting lines (optional - shows network)
    g.append("g")
      .attr("class", "lines")
      .selectAll("line")
      .data(locationNodes)
      .join("line")
      .attr("x1", dimensions.width / 2)
      .attr("y1", dimensions.height / 2)
      .attr("x2", (d) => d.x)
      .attr("y2", (d) => d.y)
      .attr("stroke", "#9ca3af")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4,4")
      .attr("opacity", 0.4);

    // Draw location nodes
    const nodes = g
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(locationNodes)
      .join("g")
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .style("cursor", "pointer");

    // Add circles for each location
    nodes
      .append("circle")
      .attr("r", 24)
      .attr("fill", "#ffffff")
      .attr("stroke", "#4b5563")
      .attr("stroke-width", 2.5)
      .attr("filter", "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))")
      .transition()
      .duration(500)
      .delay((_, i) => i * 100)
      .attr("r", 32);

    // Add icons (MapPin representation as circle)
    nodes
      .append("circle")
      .attr("r", 10)
      .attr("fill", "#1f2937")
      .attr("opacity", 0)
      .transition()
      .duration(500)
      .delay((_, i) => i * 100)
      .attr("opacity", 1);

    // Add location labels
    nodes
      .append("text")
      .attr("y", 50)
      .attr("text-anchor", "middle")
      .attr("fill", "#111827")
      .attr("font-size", "15px")
      .attr("font-weight", "700")
      .attr("letter-spacing", "0.3px")
      .text((d) => d.name);

    // Add hover interactions
    nodes
      .on("mouseenter", function (event, d) {
        d3.select(this)
          .select("circle:first-child")
          .transition()
          .duration(200)
          .attr("r", 38)
          .attr("fill", "#f3f4f6")
          .attr("stroke", "#111827")
          .attr("stroke-width", 3);

        // Show tooltip
        if (tooltipRef.current) {
          const tooltip = d3.select(tooltipRef.current);
          tooltip
            .style("opacity", 1)
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 10}px`)
            .html(
              `
              <div class="font-semibold text-gray-900 mb-1">${d.name}</div>
              <div class="text-sm text-gray-600">Click to explore events</div>
            `
            );
        }
      })
      .on("mouseleave", function () {
        d3.select(this)
          .select("circle:first-child")
          .transition()
          .duration(200)
          .attr("r", 32)
          .attr("fill", "#ffffff")
          .attr("stroke", "#4b5563")
          .attr("stroke-width", 2.5);

        // Hide tooltip
        if (tooltipRef.current) {
          d3.select(tooltipRef.current).style("opacity", 0);
        }
      })
      .on("click", (_, d) => {
        onSelect(d.slug);
      });

    // Add central hub
    const hub = g
      .append("g")
      .attr(
        "transform",
        `translate(${dimensions.width / 2},${dimensions.height / 2})`
      );

    hub
      .append("circle")
      .attr("r", 0)
      .attr("fill", "#1f2937")
      .attr("stroke", "#111827")
      .attr("stroke-width", 3)
      .attr("filter", "drop-shadow(0 6px 12px rgba(0, 0, 0, 0.15))")
      .transition()
      .duration(800)
      .attr("r", 50);

    hub
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "#ffffff")
      .attr("font-size", "14px")
      .attr("font-weight", "700")
      .attr("letter-spacing", "0.5px")
      .attr("opacity", 0)
      .text("EVENTS")
      .transition()
      .duration(800)
      .delay(400)
      .attr("opacity", 1);
  }, [locationNodes, dimensions, onSelect]);

  return (
    <div className="relative w-full">
      {/* Map container */}
      <motion.div
        className="bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 border-gray-300 p-8 shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-center mb-6">
          <MapPin size={22} className="text-gray-800 mr-2" />
          <h3 className="text-xl font-bold text-gray-900">
            Interactive Location Map
          </h3>
        </div>

        <svg
          ref={svgRef}
          width="100%"
          height={dimensions.height}
          style={{ overflow: "visible" }}
        />

        <p className="text-center text-sm font-medium text-gray-700 mt-6 bg-gray-100 py-2 px-4 rounded-lg inline-block">
          💡 Click on any location to explore available events
        </p>
      </motion.div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed pointer-events-none bg-gray-900 text-white border-2 border-gray-700 rounded-lg shadow-2xl px-4 py-3 opacity-0 transition-opacity z-50"
        style={{
          maxWidth: "250px",
        }}
      />
    </div>
  );
}
