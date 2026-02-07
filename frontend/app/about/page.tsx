import Link from 'next/link'
import { Gamepad2, Trophy, Video, Heart } from 'lucide-react'

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-white">GamerStream</Link>
          <div className="space-x-6">
            <Link href="/" className="text-white hover:text-purple-300">Home</Link>
            <Link href="/about" className="text-white hover:text-purple-300">About</Link>
            <Link href="/subscribe" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg">
              Subscribe
            </Link>
          </div>
        </div>
      </nav>

      {/* About Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Gamepad2 className="w-20 h-20 text-purple-400 mx-auto mb-6" />
            <h1 className="text-5xl font-bold text-white mb-4">About Me</h1>
            <p className="text-xl text-gray-300">
              Professional eFootball Player & Content Creator
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-8 mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">My Story</h2>
            <p className="text-gray-300 text-lg leading-relaxed mb-4">
              Welcome to my gaming world! I'm a passionate eFootball player who has been streaming
              and creating content for the gaming community. My journey started with a love for
              football and gaming, which naturally evolved into sharing my experiences with others.
            </p>
            <p className="text-gray-300 text-lg leading-relaxed">
              Through my streams, I aim to entertain, educate, and build a community of gamers who
              share the same passion for eFootball. Whether you're looking to improve your gameplay,
              learn new strategies, or just enjoy watching exciting matches, you're in the right place!
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <Trophy className="w-12 h-12 text-purple-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Achievements</h3>
              <ul className="text-gray-300 space-y-2">
                <li>• Top 100 eFootball Player</li>
                <li>• 10,000+ Hours of Gameplay</li>
                <li>• Multiple Tournament Wins</li>
                <li>• Active Content Creator</li>
              </ul>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <Video className="w-12 h-12 text-purple-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Content</h3>
              <ul className="text-gray-300 space-y-2">
                <li>• Live eFootball Matches</li>
                <li>• Gameplay Tutorials</li>
                <li>• Strategy Guides</li>
                <li>• Community Challenges</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <Heart className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-4">Join the Community</h3>
            <p className="text-gray-300 mb-6">
              Subscribe to get exclusive access to all my content and join our amazing community!
            </p>
            <Link
              href="/subscribe"
              className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg text-lg font-semibold"
            >
              Subscribe Now
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-gray-800">
        <div className="text-center text-gray-400">
          <p>&copy; 2024 GamerStream. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
