'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ToastViewport } from '@/components/ui/Toast';

export default function ToastHost(){
	const [root, setRoot] = useState<Element | null>(null);
	useEffect(() => { setRoot(document.getElementById('ui-fixed-root')); }, []);
	if (!root) return null;
	return createPortal(<ToastViewport />, root);
}















