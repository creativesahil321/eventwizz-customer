"use client"
import { useReportWebVitals } from 'next/web-vitals';

export default function WebVitalsLogger() {
    useReportWebVitals((metric) => {
        console.log("Web Vital Metric:", metric);
        // You can send this to an analytics service here
    });

    return null; // No UI needed
}
