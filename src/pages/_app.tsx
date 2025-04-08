import type { AppProps } from "next/app";
import { Poppins } from "next/font/google";
import "../styles/globals.css";
import NavBar from "../components/NavBar";

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${poppins.variable} font-sans bg-[#343541] text-white`}>
      <div className="min-h-screen">
        <NavBar />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <Component {...pageProps} />
        </main>
      </div>
    </div>
  );
}
