'use client';
import { useEffect } from 'react';

/** Sets --app-vh to window.innerHeight * 0.01 (iOS safe). */
export default function VhFixer(){
	useEffect(() => {
		const set = () => {
			const vh = window.innerHeight * 0.01;
			document.documentElement.style.setProperty('--app-vh', `${vh}px`);
		};
		set();
		window.addEventListener('resize', set);
		window.addEventListener('orientationchange', set);
		return () => {
			window.removeEventListener('resize', set);
			window.removeEventListener('orientationchange', set);
		};
	}, []);
	return null;
}















