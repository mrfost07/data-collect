import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Face Data Collector - CCIS CodeHub',
    description: 'Collect labeled face images for AI training',
    viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="bg-gray-50 min-h-screen">{children}</body>
        </html>
    );
}
