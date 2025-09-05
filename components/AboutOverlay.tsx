"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

export default function AboutOverlay(){
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                aria-label="About The Somnia Odyssey"
                onClick={() => setOpen(true)}
                className="ml-2 inline-flex shrink-0 items-center px-2 py-0.5 rounded-full border border-[color:var(--outline)] bg-[color:var(--card)] text-xs leading-none cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
                About
            </button>

            {open && createPortal(
                <div className="fixed inset-0" style={{ zIndex: 2147483647 }}>
                    <div className="absolute inset-0" onClick={() => setOpen(false)} style={{ backgroundColor: 'rgba(0,0,0,0.86)', backdropFilter: 'blur(2px)' }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
                        <img
                            src="/assets/scroll.png"
                            alt="About scroll"
                            className="block"
                            style={{ height: "550px", width: "auto", maxWidth: "80vw", objectFit: "contain" }}
                        />
                        <div className="w-full max-w-[80vw] flex justify-center" style={{ marginTop: '-16px' }}>
                            <button
                                data-autofocus
                                onClick={() => setOpen(false)}
                                className="inline-flex items-center justify-center gap-2 px-10 py-2 rounded-full font-medium text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] hover:brightness-105 active:translate-y-[1px]"
                                style={{
                                    border: '2px solid #d9b77a',
                                    background: 'linear-gradient(180deg, #f5e3b5 0%, #e7cf97 100%)',
                                    boxShadow: '0 2px 0 #caa86d, 0 6px 14px rgba(0,0,0,0.15)',
                                    color: '#6b4e1e',
                                    minWidth: '160px'
                                }}
                            >
                                Ok
                            </button>
                        </div>
                        </div>
                    </div>
                </div>, typeof window !== 'undefined' ? document.body : undefined as any)}
        </>
    );
}


