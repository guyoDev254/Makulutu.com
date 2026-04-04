import Link from 'next/link'
import { Gamepad2, Video, Users, Trophy } from 'lucide-react'
import { SiteNav } from '@/components/SiteNav'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <SiteNav />

      {/* Hero Section */}
      <section className="container mx-auto max-w-7xl px-4 py-12 sm:py-16 md:py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 text-balance leading-tight">
            Welcome to <span className="text-purple-400">eFootball</span> Streaming
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-6 sm:mb-8 text-pretty px-1">
            Join the community and get exclusive access to live streams, tutorials, and gaming content
          </p>
          <Link
            href="/subscribe"
            className="inline-block w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-base sm:text-lg font-semibold transition"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto max-w-7xl px-4 py-12 sm:py-16 md:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          <div className="bg-gray-800 p-6 sm:p-8 rounded-lg">
            <Video className="w-12 h-12 text-purple-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Live Streaming</h3>
            <p className="text-gray-400">
              Watch live eFootball matches and gameplay sessions in real-time
            </p>
          </div>
          <div className="bg-gray-800 p-6 sm:p-8 rounded-lg">
            <Gamepad2 className="w-12 h-12 text-purple-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Exclusive Content</h3>
            <p className="text-gray-400">
              Access tutorials, tips, and strategies from a professional gamer
            </p>
          </div>
          <div className="bg-gray-800 p-6 sm:p-8 rounded-lg">
            <Users className="w-12 h-12 text-purple-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Community Access</h3>
            <p className="text-gray-400">
              Join our exclusive WhatsApp group and connect with other gamers
            </p>
          </div>
        </div>
      </section>

      {/* About Preview */}
      <section className="container mx-auto max-w-7xl px-4 py-12 sm:py-16 md:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <Trophy className="w-14 h-14 sm:w-16 sm:h-16 text-purple-400 mx-auto mb-4 sm:mb-6" />
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4 text-balance">
            About the Streamer
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-6 sm:mb-8 text-pretty px-1">
            Passionate eFootball player and streamer dedicated to sharing the best gaming experiences
            with the community. Join me for exciting matches, strategies, and fun!
          </p>
          <Link
            href="/about"
            className="inline-block text-purple-400 hover:text-purple-300 font-semibold"
          >
            Learn More →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto max-w-7xl px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] border-t border-gray-800">
        <div className="text-center text-gray-400">
          <p>&copy; 2024 GamerStream. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
