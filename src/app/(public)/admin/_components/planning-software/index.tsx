"use client";

import { useState, useContext } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServerContext } from "@/lib/server-context";

export default function PlanningSoftware() {
  const [videoPlaying, setVideoPlaying] = useState(false);
  const { theme } = useContext(ServerContext);

  const handlePlayVideo = () => {
    setVideoPlaying(true);
  };

  return (
    <section className="py-16 bg-[color:var(--color-surface)]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Laptop Mockup with Video */}
          <div className="relative">
            <div className="relative w-full">
              {/* Laptop Frame with Circular Background */}
              <div className="relative">
                <div className="absolute w-[80%] h-[80%] rounded-full bg-[color:var(--color-primary)]/20 top-[10%] left-[10%] z-0"></div>
                <div className="relative z-10">
                  <div className="laptop-mockup">
                    <div className="laptop-screen">
                      {videoPlaying ? (
                        <iframe
                          className="absolute inset-0 w-full h-full"
                          src="https://www.youtube.com/embed/oBqqI6NMeaM?autoplay=1"
                          title="EventWizz Demo Video"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                          <Button
                            onClick={handlePlayVideo}
                            size="icon"
                            className="rounded-full w-16 h-16 flex items-center justify-center bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/90 shadow-lg"
                          >
                            <Play className="h-6 w-6 ml-1 text-white" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="laptop-base"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Content */}
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-[color:var(--color-text)] mb-6 font-heading">
              Event Planning Software For All Your Event Needs
            </h2>
            <p className="text-[color:var(--color-text-dimmed)] mb-8 font-body">
              Maecenas non mauris arcu. Donec risus felis, laoreet quis ante
              quis, feugiat mollis orci. Integer sit amet interdum dolor. Aenean
              sagittis libero nisi, in tristique metus faucibus nec. Donec
              convallis congue lectus eu pretium. Proin pretium metus non
              ullamco. Nunc porttitor pede quis purus. In hac habitasse platea.
              Vestibulum ante. Ipsum primis in faucibus orci.
            </p>
          </div>
        </div>
      </div>

      {/* CSS for the laptop mockup */}
      <style jsx>{`
        .laptop-mockup {
          position: relative;
          width: 100%;
          max-width: 500px;
          margin: 0 auto;
        }

        .laptop-screen {
          position: relative;
          background: #252525;
          border: 12px solid #252525;
          border-radius: 10px 10px 0 0;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          width: 100%;
          height: 0;
          padding-bottom: 60%;
          overflow: hidden;
        }

        .laptop-base {
          background: #1e1e1e;
          height: 15px;
          margin: 0 -15px;
          border-radius: 0 0 10px 10px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </section>
  );
}
