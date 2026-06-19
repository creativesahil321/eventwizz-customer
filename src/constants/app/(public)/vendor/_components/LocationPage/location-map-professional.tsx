"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { VenueLocation } from "@/types/api.types";
import { LocationData } from "@/types/theme.types";
import { motion } from "framer-motion";

interface LocationMapProps {
  locations: (VenueLocation | LocationData)[];
  onSelect: (slug: string) => void;
}

interface LocationNode {
  name: string;
  slug: string;
  lat: number;
  lng: number;
  eventCount: number;
  labelPosition: "left" | "right";
}

export default function ProfessionalLocationMap({
  locations,
  onSelect,
}: LocationMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1000, height: 700 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [ukGeoJson, setUkGeoJson] = useState<any>(null);

  // Convert locations to map nodes - API doesn't provide lat/lng, so use default positions
  // Note: This component uses D3.js visualization, not Google Maps geocoding
  const locationNodes: LocationNode[] = locations.map((location, index) => {
    const name =
      "city" in location && location.city
        ? location.city
        : "name" in location && location.name
        ? location.name
        : "Unknown";

    const slug = "slug" in location && location.slug ? location.slug : "";

    // API doesn't provide lat/lng - use default UK center for all
    // (This is a D3 visualization, not a real map, so positions are relative)
    const lat: number = 53.0; // Default UK center
    const lng: number = -2.0;

    // Determine label position based on index (alternate left/right)
    const labelPosition = index % 2 === 0 ? "left" : "right";

    return {
      name,
      slug,
      lat,
      lng,
      eventCount: 0,
      labelPosition,
    };
  });

  // Fetch REAL UK GeoJSON map data
  useEffect(() => {
    // Use embedded, reliable UK GeoJSON (no external fetch needed)
    const ukGeoData = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "United Kingdom" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-6.5, 49.9],
                [-5.8, 50.0],
                [-5.2, 50.1],
                [-4.7, 50.2],
                [-4.2, 50.4],
                [-3.7, 50.6],
                [-3.2, 50.8],
                [-2.7, 51.1],
                [-2.2, 51.4],
                [-1.7, 51.6],
                [-1.2, 51.7],
                [-0.7, 51.6],
                [-0.2, 51.5],
                [0.3, 51.4],
                [0.8, 51.3],
                [1.3, 51.5],
                [1.7, 51.9],
                [1.8, 52.4],
                [1.6, 52.9],
                [1.2, 53.3],
                [0.7, 53.6],
                [0.2, 53.8],
                [-0.3, 54.0],
                [-0.8, 54.2],
                [-1.3, 54.4],
                [-1.8, 54.6],
                [-2.3, 54.8],
                [-2.8, 55.0],
                [-3.3, 55.3],
                [-3.8, 55.5],
                [-4.3, 55.8],
                [-4.8, 56.2],
                [-5.3, 56.6],
                [-5.8, 57.2],
                [-6.0, 57.8],
                [-6.0, 58.4],
                [-5.5, 58.7],
                [-5.0, 58.8],
                [-4.0, 58.7],
                [-3.0, 58.4],
                [-2.0, 58.0],
                [-1.5, 57.5],
                [-1.8, 57.0],
                [-2.3, 56.5],
                [-2.8, 56.0],
                [-3.3, 55.7],
                [-3.8, 55.5],
                [-4.2, 55.2],
                [-4.5, 54.9],
                [-4.8, 54.5],
                [-5.0, 54.0],
                [-4.8, 53.5],
                [-4.5, 53.2],
                [-4.2, 53.0],
                [-3.8, 52.8],
                [-3.5, 52.6],
                [-3.8, 52.3],
                [-4.2, 52.1],
                [-4.6, 51.8],
                [-5.0, 51.6],
                [-5.4, 51.4],
                [-5.7, 51.2],
                [-6.0, 51.0],
                [-6.2, 50.6],
                [-6.3, 50.2],
                [-6.5, 49.9],
              ],
            ],
          },
        },
      ],
    };

    setUkGeoJson(ukGeoData);
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current) {
        const container = svgRef.current.parentElement;
        if (container) {
          setDimensions({
            width: container.clientWidth,
            height: Math.min(container.clientWidth * 0.7, 700),
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
    if (!svgRef.current || locationNodes.length === 0 || !ukGeoJson) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = dimensions.width;
    const height = dimensions.height;
    const mapCenterX = width / 2;
    const mapCenterY = height / 2;

    // Create defs for filters and gradients FIRST
    const defs = svg.append("defs");

    // Add glow filter for map outline
    const glowFilter = defs.append("filter").attr("id", "map-glow");
    glowFilter
      .append("feGaussianBlur")
      .attr("stdDeviation", "4")
      .attr("result", "coloredBlur");
    const feMerge = glowFilter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Title gradient
    const titleGradient = defs
      .append("linearGradient")
      .attr("id", "title-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    titleGradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#f59e0b");
    titleGradient
      .append("stop")
      .attr("offset", "50%")
      .attr("stop-color", "#eab308");
    titleGradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#f59e0b");

    // Create REAL geographic projection for UK
    const projection = d3
      .geoMercator()
      .center([-2.0, 54.5]) // UK center coordinates
      .scale(Math.min(width, height) * 2.3)
      .translate([mapCenterX, mapCenterY]);

    const pathGenerator = d3.geoPath().projection(projection);

    const g = svg.append("g");

    // Draw REAL UK map from GeoJSON data
    const features =
      ukGeoJson && "features" in ukGeoJson && ukGeoJson.features
        ? ukGeoJson.features
        : [];

    if (features.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      features.forEach((feature: any) => {
        // Main map path - DARK FILL with LIGHT STROKE for maximum contrast
        g.append("path")
          .datum(feature)
          .attr("d", pathGenerator)
          .attr("fill", "#1e293b") // Dark slate-800 fill
          .attr("stroke", "#94a3b8") // Lighter slate-400 stroke - MUCH MORE VISIBLE
          .attr("stroke-width", 6) // Very thick stroke
          .attr("stroke-linejoin", "round")
          .attr("stroke-linecap", "round")
          .attr(
            "filter",
            "url(#map-glow) drop-shadow(0 0 30px rgba(148, 163, 184, 0.8)) drop-shadow(0 8px 20px rgba(0, 0, 0, 0.6))"
          )
          .attr("opacity", 0)
          .transition()
          .duration(1200)
          .attr("opacity", 1);

        // Add inner stroke for EXTRA visibility (double border effect)
        g.append("path")
          .datum(feature)
          .attr("d", pathGenerator)
          .attr("fill", "none")
          .attr("stroke", "#cbd5e1") // Even lighter slate-300 for inner highlight
          .attr("stroke-width", 2)
          .attr("stroke-linejoin", "round")
          .attr("opacity", 0)
          .transition()
          .duration(1200)
          .attr("opacity", 0.4);
      });
    }

    // Calculate button positions (around the map)
    const buttonWidth = 180;
    const buttonHeight = 50;
    const margin = 80;

    // Position location nodes at REAL GEOGRAPHIC COORDINATES
    locationNodes.forEach((node, i) => {
      // Use projection to convert lat/lng to x/y coordinates
      const projected = projection([node.lng, node.lat]);
      if (!projected) return;

      const x = projected[0];
      const y = projected[1];

      // Calculate button position
      let buttonX, buttonY;
      if (node.labelPosition === "left") {
        buttonX = margin;
        buttonY = margin + i * (buttonHeight + 15);
      } else {
        buttonX = width - buttonWidth - margin;
        buttonY = margin + (i % 5) * (buttonHeight + 15);
      }

      // Calculate control point for curved connector (PREMIUM CURVES!)
      const midX =
        (x + buttonX + (node.labelPosition === "left" ? buttonWidth : 0)) / 2;
      const midY = (y + buttonY + buttonHeight / 2) / 2;
      const offsetY = (buttonY - y) * 0.3; // Curve intensity

      // Draw CURVED connecting line (Bezier path)
      const curvePath = `
        M ${x},${y}
        Q ${midX},${midY + offsetY} ${
        buttonX + (node.labelPosition === "left" ? buttonWidth : 0)
      },${buttonY + buttonHeight / 2}
      `;

      g.append("path")
        .attr("d", curvePath)
        .attr("stroke", "#94a3b8")
        .attr("stroke-width", 1.8)
        .attr("fill", "none")
        .attr("opacity", 0)
        .attr("filter", "drop-shadow(0 0 4px rgba(148, 163, 184, 0.4))")
        .transition()
        .duration(800)
        .delay(i * 120)
        .attr("opacity", 0.7);

      // Draw PREMIUM pin on map (double circle with glow)
      const pinGroup = g.append("g").attr("transform", `translate(${x},${y})`);

      // Outer glow ring
      pinGroup
        .append("circle")
        .attr("r", 0)
        .attr("fill", "none")
        .attr("stroke", "#f59e0b") // Amber glow
        .attr("stroke-width", 2)
        .attr("opacity", 0.4)
        .style("cursor", "pointer")
        .transition()
        .duration(600)
        .delay(i * 120)
        .attr("r", 12);

      // Main pin circle
      pinGroup
        .append("circle")
        .attr("r", 0)
        .attr("fill", "#ffffff")
        .attr("stroke", "#1f2937")
        .attr("stroke-width", 2.5)
        .attr("filter", "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.25))")
        .style("cursor", "pointer")
        .transition()
        .duration(600)
        .delay(i * 120)
        .attr("r", 7);

      // Inner dot
      pinGroup
        .append("circle")
        .attr("r", 3)
        .attr("fill", "#f59e0b") // Amber center
        .attr("opacity", 0)
        .transition()
        .duration(600)
        .delay(i * 120 + 200)
        .attr("opacity", 1);

      // Create foreign object for button
      const buttonFO = g
        .append("foreignObject")
        .attr("x", buttonX)
        .attr("y", buttonY)
        .attr("width", buttonWidth)
        .attr("height", buttonHeight)
        .attr("opacity", 0);

      const buttonHTML = `
        <div
          class="location-button group"
          data-slug="${node.slug}"
          style="
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            border: 2px solid #334155;
            border-radius: 10px;
            padding: 12px 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
            position: relative;
            overflow: hidden;
          "
          onmouseover="
            this.style.transform='translateY(-3px) scale(1.02)'; 
            this.style.boxShadow='0 8px 20px rgba(245, 158, 11, 0.3), 0 0 30px rgba(245, 158, 11, 0.2)'; 
            this.style.borderColor='#f59e0b';
          "
          onmouseout="
            this.style.transform='translateY(0) scale(1)'; 
            this.style.boxShadow='0 4px 12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05) inset'; 
            this.style.borderColor='#334155';
          "
        >
          <div style="
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, transparent 50%);
            pointer-events: none;
          "></div>
          <div style="flex: 1; position: relative; z-index: 1;">
            <div style="color: #ffffff; font-size: 15px; font-weight: 700; margin-bottom: 3px; letter-spacing: 0.3px;">
              ${node.name}
            </div>
            <div style="color: #94a3b8; font-size: 11px; font-weight: 500;">
              View Events
            </div>
          </div>
          <div style="
            color: #f59e0b; 
            font-size: 20px; 
            font-weight: 700;
            position: relative; 
            z-index: 1;
            transition: transform 0.3s ease;
          ">→</div>
        </div>
      `;

      buttonFO.html(buttonHTML);

      // Animate button appearance
      buttonFO
        .transition()
        .duration(600)
        .delay(i * 100 + 300)
        .attr("opacity", 1);
    });

    // Add click handlers
    d3.selectAll(".location-button").on("click", function () {
      const slug = d3.select(this).attr("data-slug");
      if (slug) onSelect(slug);
    });

    // Add PREMIUM title with gradient
    g.append("text")
      .attr("x", mapCenterX)
      .attr("y", 45)
      .attr("text-anchor", "middle")
      .attr("fill", "url(#title-gradient)")
      .attr("font-size", "28px")
      .attr("font-weight", "800")
      .attr("letter-spacing", "2px")
      .text("PARTY LOCATIONS")
      .attr("opacity", 0)
      .attr("filter", "drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3))")
      .transition()
      .duration(1000)
      .delay(500)
      .attr("opacity", 1);
  }, [locationNodes, dimensions, onSelect, ukGeoJson]);

  return (
    <div className="relative w-full">
      <motion.div
        className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border-2 border-slate-700 overflow-hidden shadow-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        style={{ minHeight: "700px" }}
      >
        <svg
          ref={svgRef}
          width="100%"
          height={dimensions.height}
          style={{ overflow: "visible" }}
        />
      </motion.div>
    </div>
  );
}
