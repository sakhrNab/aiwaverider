import React, { useState, useEffect } from 'react';
import { HashLoader } from 'react-spinners';
import { FaRobot, FaTools, FaLightbulb, FaCalendarAlt, FaArrowRight, FaUserGraduate, FaChartLine, FaCheck, FaChevronRight, FaStar, FaTimes, FaClock, FaRandom, FaUserFriends, FaDollarSign, FaQuestion } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import sakhrProfileImg from '../assets/sakhr-profile.jpg';
import tazProfileImg from '../assets/taz-profile.jpg';
import simpleToSellImg from '../assets/simple-to-sell.png';
import savingTimeImg from '../assets/saving-time.png';
import makingAiEasyImg from '../assets/making-ai-easy.png';

const HomePage = () => {
  const [loading, setLoading] = useState(true);
  const { darkMode } = useTheme();
  
  // Simulate loading state for demonstration
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1200);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gradient-to-b from-gray-900 to-blue-900">
        <div className="mb-8">
          <HashLoader color="#4FD1C5" size={70} speedMultiplier={0.8} />
        </div>
        <div className="text-white text-xl font-semibold mt-4">
          Initializing AI Waverider
        </div>
        <div className="text-blue-300 text-sm mt-2">
          Connecting to neural networks...
        </div>
      </div>
    );
  }

  // Testimonial data
  const testimonials = [
    {
      id: 1,
      name: 'Sarah Johnson',
      role: 'Marketing Consultant',
      image: '/testimonial-1.jpg',
      quote: 'I was skeptical about AI monetization, but this program changed everything. Within 3 weeks, I closed my first $2,500 AI setup client!',
      stars: 5
    },
    {
      id: 2,
      name: 'Michael Rodriguez',
      role: 'Small Business Owner',
      image: '/testimonial-2.jpg',
      quote: 'The step-by-step approach made it so easy to understand how to sell AI services. I\'ve added a new revenue stream to my business without needing any technical skills.',
      stars: 5
    },
    {
      id: 3,
      name: 'Jennifer Lee',
      role: 'Freelance Copywriter',
      image: '/testimonial-3.jpg',
      quote: 'This is the most practical AI business training I\'ve ever taken. I\'m now earning $3,000/month in recurring revenue from AI retainer clients!',
      stars: 5
    }
  ];
  
  return (
    <div className={`${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}>
      {/* Custom booking header that matches the screenshot */}
      <div className="bg-indigo-900 py-6 px-6">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-white">AI Waverider</h2>
            <p className="text-yellow-500 font-medium">Your Gateway to AI Mastery</p>
          </div>
          <div className="mt-4 md:mt-0">
            <a 
              href="https://calendly.com/your-booking-link" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-red-500 text-white rounded-full font-semibold flex items-center heartbeat-pulse"
            >
              <FaCalendarAlt className="mr-2" />
              Book a Training Session
              <FaArrowRight className="ml-2" />
            </a>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className={`py-20 ${darkMode ? 'bg-gray-800' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center">
            <div className="lg:w-1/2 lg:pr-10 mb-10 lg:mb-0">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-teal-400">Ride The AI Wave</span> & Turn Your Skills Into Income
              </h1>
              <p className="text-xl md:text-2xl mb-8 max-w-2xl">
                Learn how to monetize AI without being technical. 7 proven business models to help you sell AI services and make $2,000-$10,000/month as an AI Waverider.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link to="/monetization-paths" className="px-8 py-4 bg-gradient-to-r from-blue-500 to-teal-400 text-white rounded-full font-bold text-lg transition-all hover:shadow-lg inline-flex items-center justify-center">
                  Explore Monetization Paths <FaArrowRight className="ml-2" />
                </Link>
                <a href="#book-call" className="px-8 py-4 border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white rounded-full font-bold text-lg transition-all inline-flex items-center justify-center">
                  Book A Strategy Call <FaChevronRight className="ml-2" />
                </a>
              </div>
              
              <div className={`flex items-center space-x-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <FaCheck className="text-green-500" />
                <span>No technical experience required</span>
              </div>
              <div className={`flex items-center space-x-2 mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <FaCheck className="text-green-500" />
                <span>Make $2,000-$10,000/month with our proven models</span>
            </div>
              <div className={`flex items-center space-x-2 mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <FaCheck className="text-green-500" />
                <span>Start monetizing in as little as 7 days</span>
              </div>
            </div>
            <div className="lg:w-1/2">
              <img 
                src="/ai-surfer-hero.png" 
                alt="AI Waverider" 
                className="rounded-lg shadow-2xl w-full max-w-lg mx-auto transform hover:-translate-y-2 transition-transform duration-300" 
                onError={(e) => { e.target.src = 'https://placehold.co/800x600/blue/white?text=AI+Wave+Rider'; }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Monetization Paths */}
      <section className={`py-20 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              7 Proven Ways To Monetize AI
            </h2>
            <p className={`max-w-3xl mx-auto text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Discover the exact monetization paths that are working right now, with detailed guidance on how to implement each one.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
            {/* Card 1 */}
            <div className={`rounded-xl overflow-hidden shadow-lg transition-all hover:shadow-2xl ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'}`}>
              <div className="p-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white`}>
                  <FaRobot className="text-2xl" />
                </div>
                <h3 className={`text-xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Software Referral</h3>
                <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Earn a 40% commission by referring businesses to AI tools they need. No technical skills required, just connect businesses with the right solutions.
                </p>
                <p className={`font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                  Potential Income: $500-$5,000/month
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className={`rounded-xl overflow-hidden shadow-lg transition-all hover:shadow-2xl ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'}`}>
              <div className="p-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white`}>
                  <FaTools className="text-2xl" />
                </div>
                <h3 className={`text-xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Setup/Build Fees</h3>
                <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Charge $500-$15,000 for setting up AI tools for businesses. Includes customization, training, and implementation services.
                </p>
                <p className={`font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                  Potential Income: $1,500-$15,000 per project
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className={`rounded-xl overflow-hidden shadow-lg transition-all hover:shadow-2xl ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'}`}>
              <div className="p-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white`}>
                  <FaCalendarAlt className="text-2xl" />
                </div>
                <h3 className={`text-xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Monthly Retainer</h3>
                <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Manage AI tools for clients on an ongoing basis. Provide monthly maintenance, updates, and optimization to ensure maximum ROI.
                </p>
                <p className={`font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                  Potential Income: $1,000-$5,000/month per client
                </p>
              </div>
            </div>

            {/* Card 4 */}
            <div className={`rounded-xl overflow-hidden shadow-lg transition-all hover:shadow-2xl ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'}`}>
              <div className="p-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white`}>
                  <FaUserGraduate className="text-2xl" />
                </div>
                <h3 className={`text-xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Consulting</h3>
                <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Charge $150-$500/hour for strategic AI consulting. Help businesses identify opportunities, develop AI strategies, and implement AI solutions.
                </p>
                <p className={`font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                  Potential Income: $3,000-$20,000/month
                </p>
              </div>
            </div>

            {/* Card 5 */}
            <div className={`rounded-xl overflow-hidden shadow-lg transition-all hover:shadow-2xl ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'}`}>
              <div className="p-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white`}>
                  <FaChartLine className="text-2xl" />
                </div>
                <h3 className={`text-xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Profit Sharing</h3>
                <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Earn 5%-35% of the sales generated through AI implementation. This performance-based model aligns your income with client success.
                </p>
                <p className={`font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                  Potential Income: Unlimited (based on client success)
                </p>
              </div>
            </div>

            {/* Card 6 */}
            <div className={`rounded-xl overflow-hidden shadow-lg transition-all hover:shadow-2xl ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'}`}>
              <div className="p-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white`}>
                  <FaLightbulb className="text-2xl" />
                </div>
                <h3 className={`text-xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Equity Deals</h3>
                <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Get part ownership in companies you help transform with AI. Ideal for startups and businesses with high growth potential.
                </p>
                <p className={`font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                  Potential Value: $100,000+ in equity
                </p>
              </div>
            </div>

            {/* Card 7 */}
            <div className={`rounded-xl overflow-hidden shadow-lg transition-all hover:shadow-2xl ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'}`}>
              <div className="p-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white`}>
                  <FaStar className="text-2xl" />
                </div>
                <h3 className={`text-xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Affiliate/Referral Program</h3>
                <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Earn 30% of all sales you refer to our program. Recommend our training to others and get paid recurring commissions.
                </p>
                <p className={`font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                  Potential Income: 30% of all referred sales
                </p>
              </div>
            </div>
          </div>

          <div className="text-center mt-16">
            <Link to="/monetization-paths" className={`px-8 py-4 rounded-full font-bold text-lg transition-all inline-flex items-center ${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>
              Explore All Monetization Paths <FaChevronRight className="ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Obstacles Section */}
      <section className={`py-20 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Common Obstacles To Monetizing AI
            </h2>
            <p className={`max-w-3xl mx-auto text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              These are the key challenges that prevent most people from successfully riding the AI wave
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Obstacle 1 */}
            <div className={`p-8 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-white shadow-md'}`}>
              <div className="flex items-center mb-6">
                <div className={`w-12 h-12 rounded-full ${darkMode ? 'bg-red-500' : 'bg-red-500'} flex items-center justify-center text-white mr-4`}>
                  <FaTimes />
                </div>
                <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Too Technical</h3>
              </div>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Many believe they need coding skills or advanced technical knowledge to profit from AI. Our approach requires no technical background - we focus on business applications anyone can implement.
              </p>
            </div>

            {/* Obstacle 2 */}
            <div className={`p-8 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-white shadow-md'}`}>
              <div className="flex items-center mb-6">
                <div className={`w-12 h-12 rounded-full ${darkMode ? 'bg-orange-500' : 'bg-orange-500'} flex items-center justify-center text-white mr-4`}>
                  <FaClock />
                </div>
                <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>No Time</h3>
              </div>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Most AI courses require months of study. Our program is designed for busy professionals who need practical, actionable strategies they can implement immediately, even with just 5-10 hours per week.
              </p>
            </div>

            {/* Obstacle 3 */}
            <div className={`p-8 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-white shadow-md'}`}>
              <div className="flex items-center mb-6">
                <div className={`w-12 h-12 rounded-full ${darkMode ? 'bg-yellow-500' : 'bg-yellow-500'} flex items-center justify-center text-white mr-4`}>
                  <FaRandom />
                </div>
                <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Too Many Choices</h3>
              </div>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                The AI landscape is overwhelming with thousands of tools and endless possibilities. We cut through the noise with a clear roadmap focusing only on what works right now for monetization.
              </p>
            </div>

            {/* Obstacle 4 */}
            <div className={`p-8 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-white shadow-md'}`}>
              <div className="flex items-center mb-6">
                <div className={`w-12 h-12 rounded-full ${darkMode ? 'bg-green-500' : 'bg-green-500'} flex items-center justify-center text-white mr-4`}>
                  <FaUserFriends />
                </div>
                <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Finding Clients</h3>
              </div>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Many struggle to find businesses that need AI services. We provide proven outreach templates and targeting strategies to connect with ideal clients who are ready to pay for AI expertise.
              </p>
            </div>

            {/* Obstacle 5 */}
            <div className={`p-8 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-white shadow-md'}`}>
              <div className="flex items-center mb-6">
                <div className={`w-12 h-12 rounded-full ${darkMode ? 'bg-blue-500' : 'bg-blue-500'} flex items-center justify-center text-white mr-4`}>
                  <FaDollarSign />
                </div>
                <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Pricing Your Services</h3>
              </div>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Determining what to charge for AI services is challenging. Our program includes pricing frameworks and value-based pricing strategies that maximize your income while delivering clear ROI to clients.
              </p>
            </div>

            {/* Obstacle 6 */}
            <div className={`p-8 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-white shadow-md'}`}>
              <div className="flex items-center mb-6">
                <div className={`w-12 h-12 rounded-full ${darkMode ? 'bg-purple-500' : 'bg-purple-500'} flex items-center justify-center text-white mr-4`}>
                  <FaQuestion />
                </div>
                <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Lack of Support</h3>
              </div>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Going solo in a new field is tough. Our program includes community support, mentorship, and accountability to ensure you succeed. You'll never feel alone on your AI monetization journey.
              </p>
            </div>
          </div>

          <div className="text-center mt-16">
            <Link to="/obstacles" className={`px-8 py-4 rounded-full font-bold text-lg transition-all inline-flex items-center ${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>
              Learn How We Solve These Obstacles <FaChevronRight className="ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className={`py-20 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Your Easy Path To Selling AI:
              <br />No Tech Skills Needed, No Time Wasted
              </h2>
            <p className={`max-w-2xl mx-auto text-xl ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              We understand these challenges.
              <br />And we're here to make AI quick and easy to monetize by:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-20">
            <div>
              <img 
                src={makingAiEasyImg} 
                alt="Making AI Easy" 
                className="rounded-lg shadow-xl w-full max-w-md mx-auto" 
                onError={(e) => { e.target.src = 'https://placehold.co/600x400/indigo/white?text=Making+AI+Easy'; }}
              />
            </div>
            <div>
              <h4 className={`text-xl font-semibold mb-3 ${darkMode ? 'text-teal-400' : 'text-teal-600'}`}>
                Making AI Easy
              </h4>
              <p className={`mb-8 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Providing you a proven strategy and business in a box that's ready for you to generate leads and close more clients. Broken down into easy-to-understand steps, and plain language... so you can apply them and start selling AI in as little as 24 hours without being a tech wizard.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-20">
            <div className="order-2 md:order-1">
              <h4 className={`text-xl font-semibold mb-3 ${darkMode ? 'text-teal-400' : 'text-teal-600'}`}>
                Saving You Time
              </h4>
              <p className={`mb-8 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                We know you're busy. That's why we make selling AI quick and efficient. Our process is designed to get you up and running within hours, not days or weeks. We handle the heavy lifting so you can focus on closing more clients on AI.
              </p>
            </div>
            <div className="order-1 md:order-2">
              <img 
                src={savingTimeImg} 
                alt="Saving Time" 
                className="rounded-lg shadow-xl w-full max-w-md mx-auto" 
                onError={(e) => { e.target.src = 'https://placehold.co/600x400/indigo/white?text=Saving+Time'; }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <img 
                src={simpleToSellImg} 
                alt="Simple To Sell" 
                className="rounded-lg shadow-xl w-full max-w-md mx-auto" 
                onError={(e) => { e.target.src = 'https://placehold.co/600x400/indigo/white?text=Simple+To+Sell'; }}
              />
            </div>
            <div>
              <h4 className={`text-xl font-semibold mb-3 ${darkMode ? 'text-teal-400' : 'text-teal-600'}`}>
                Simple To Sell
              </h4>
              <p className={`mb-8 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                No more confusion and overwhelm. We provide you with your pre-designed business in a box and AI tools all in one place. Simply plug and play for your own business while getting paid to set these AI tools up for business owners. It doesn't stop there... we also show you how to leverage other name brand AI tools that we feel are leading the way in the world.
              </p>
            </div>
          </div>

          <div className="text-center mt-16">
            <button 
              onClick={() => document.dispatchEvent(new CustomEvent('open-signup-modal'))}
              className="px-10 py-4 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-bold text-lg transition-all inline-flex items-center"
            >
              START FREE TRIAL
            </button>
          </div>
        </div>
      </section>

      {/* Meet Your AI Educators Section */}
      <section className="py-24 relative bg-black" style={{
        backgroundImage: 'url("https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2961&q=80")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        <div className="container mx-auto px-5 max-w-6xl">
          <h2 className="text-5xl md:text-6xl font-bold text-white text-center mb-16">
            MEET YOUR AI EDUCATORS!
          </h2>
          
          {/* Sakhr Nabil */}
          <div className="flex flex-col lg:flex-row items-stretch gap-10 mb-24">
            {/* Educator Card */}
            <div className="w-full lg:w-1/3">
              <div className="rounded-3xl overflow-hidden border-4 border-white h-full relative" style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)'
              }}>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-purple-900/40 mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2072&q=80')] bg-cover bg-center opacity-40 mix-blend-overlay"></div>
                <img 
                  src={sakhrProfileImg} 
                  alt="Sakhr Nabil" 
                  className="w-full h-full object-cover relative z-10"
                  onError={(e) => { e.target.src = 'https://placehold.co/600x800/333/white?text=Sakhr+Nabil'; }}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6 z-20">
                  <h3 className="text-4xl font-bold text-white">SAKHR</h3>
                  <h4 className="text-3xl font-bold text-white">NABIL</h4>
                </div>
              </div>
            </div>
            
            {/* Educator Bio */}
            <div className="w-full lg:w-2/3">
              <div className="text-white space-y-6">
                <h3 className="text-2xl font-semibold text-white">From Yemen to Germany, from code to creator — I'm building the future with AI.</h3>

                <p className="text-lg leading-relaxed">
                  At 18, I left Yemen and moved to Germany with nothing but curiosity and ambition. I learned German, studied economic engineering, and eventually discovered my true passion in <strong className="text-pink-300 font-semibold">applied computer science</strong>. While earning my degree from German universities, I balanced full‑time study with hands‑on roles at <strong className="text-pink-300 font-semibold">Bosch Services</strong>, <strong className="text-pink-300 font-semibold">BMG Rights Management</strong>, <strong className="text-pink-300 font-semibold">Innocean Worldwide</strong>, and <strong className="text-pink-300 font-semibold">GNPH</strong>, gaining real-world experience across diverse industries.
                </p>

                <p className="text-lg leading-relaxed">
                  For the last <strong className="text-pink-300 font-semibold">3 years</strong>, I've been a full‑stack developer at <strong className="text-pink-300 font-semibold">Accenture</strong>, delivering high‑impact solutions for some of the world's largest brands. Along the way, I dove deep into AI, won hackathons, earned multiple cloud certifications, and harnessed GPT models to build tools that drive tangible business results.
                </p>

                <p className="text-lg leading-relaxed">
                  Beyond code, I'm fluent in <strong className="text-pink-300 font-semibold">Arabic, German, English</strong>, and conversational in <strong className="text-pink-300 font-semibold">Spanish</strong>, enabling me to connect, present, and collaborate globally.
                </p>

                <p className="text-lg leading-relaxed">
                  Today, I'm co‑founding <strong className="text-pink-300 font-semibold">AI Waverider</strong>—a movement and media brand dedicated to empowering creators, solopreneurs, and teams to work faster, scale smarter, and reclaim their time using AI. As we grow our TikTok and online presence, I share the exact workflows, prompt‑engineering blueprints, and growth hacks we use—so anyone, anywhere, can ride the AI wave and build something truly meaningful.
                </p>

                <ul className="space-y-2 pl-5">
                  <li className="flex items-start">
                    <span className="text-pink-300 mr-2">•</span>
                    <span><strong className="text-pink-300 font-semibold">AI‑driven workflows</strong> that automate busywork and amplify your expertise</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-pink-300 mr-2">•</span>
                    <span><strong className="text-pink-300 font-semibold">Prompt‑engineering blueprints</strong> for on‑demand insights, content, and strategy</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-pink-300 mr-2">•</span>
                    <span><strong className="text-pink-300 font-semibold">Multilingual support</strong> to unite our global community without language barriers</span>
                  </li>
                </ul>
                
                <div className="flex items-center mt-8">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-pink-300 mr-4">
                    <img 
                      src={sakhrProfileImg} 
                      alt="Sakhr Nabil" 
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = 'https://placehold.co/200x200/333/white?text=S'; }}
                    />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white">SAKHR NABIL</h4>
                    <p className="text-lg text-white">CHIEF AI WAVERIDER INSTRUCTOR</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Taz Awn */}
          <div className="flex flex-col lg:flex-row-reverse items-stretch gap-10">
            {/* Educator Card */}
            <div className="w-full lg:w-1/3">
              <div className="rounded-3xl overflow-hidden border-4 border-white h-full relative" style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)'
              }}>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-purple-900/40 mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2072&q=80')] bg-cover bg-center opacity-40 mix-blend-overlay"></div>
                <img 
                  src={tazProfileImg} 
                  alt="Taz Awn" 
                  className="w-full h-full object-cover relative z-10"
                  onError={(e) => { e.target.src = 'https://placehold.co/600x800/333/white?text=Taz+Awn'; }}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6 z-20">
                  <h3 className="text-4xl font-bold text-white">TAZ</h3>
                  <h4 className="text-3xl font-bold text-white">AWN</h4>
                </div>
              </div>
            </div>
            
            {/* Educator Bio */}
            <div className="w-full lg:w-2/3">
              <div className="text-white space-y-6">
                <h3 className="text-2xl font-semibold text-white">From Yemen's heartland to the world stage—guiding creators in four languages toward freedom and impact.</h3>
                
                <p className="text-lg leading-relaxed">
                  For over a decade, I've empowered more than <strong className="text-pink-300 font-semibold">3,000 clients</strong>—CEOs, solopreneurs, managers, and entrepreneurs—across five continents. Whether I'm delivering high‑energy keynotes or deep‑dive coaching sessions, I connect authentically in <strong className="text-pink-300 font-semibold">Arabic, English, German, and French</strong>, breaking down cultural barriers and sparking action in every room.
                </p>

                <p className="text-lg leading-relaxed">
                  Having trained alongside and under the lineage of <strong className="text-pink-300 font-semibold">Tony Robbins</strong>, I've distilled the world's most effective mindset, leadership, and behavioral‑change strategies into bite‑size, immediately actionable frameworks. My hallmark is fusing <strong className="text-pink-300 font-semibold">emotional intelligence</strong> with <strong className="text-pink-300 font-semibold">hard business rigor</strong>—so leaders not only grow their revenues but also reclaim their purpose, passion, and peace of mind.
                </p>

                <p className="text-lg leading-relaxed">
                  Now, as co‑founder of <strong className="text-pink-300 font-semibold">AI Waverider</strong>, I'm on a mission to merge that human‑centered coaching with cutting‑edge AI. We equip creators, coaches, and teams with:
                </p>
                <ul className="space-y-2 pl-5">
                  <li className="flex items-start">
                    <span className="text-pink-300 mr-2">•</span>
                    <span><strong className="text-pink-300 font-semibold">Plug‑and‑play AI workflows</strong> that automate busywork and amplify their unique expertise</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-pink-300 mr-2">•</span>
                    <span><strong className="text-pink-300 font-semibold">Prompt‑engineering blueprints</strong> that generate exactly the insights, content, or strategies they need—on demand</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-pink-300 mr-2">•</span>
                    <span><strong className="text-pink-300 font-semibold">Live training &amp; polyglot support</strong> so our global community can learn, implement, and scale without language friction</span>
                  </li>
                </ul>
                <p className="text-lg leading-relaxed">
                  Because true success isn't just about systems or software—it's about feeling alive as you grow. Let's ride the AI wave together.
                </p>
                <div className="flex items-center mt-8">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-pink-300 mr-4">
                    <img 
                      src={tazProfileImg} 
                      alt="Taz Awn" 
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = 'https://placehold.co/200x200/333/white?text=T'; }}
                    />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white">TAZ AWN</h4>
                    <p className="text-lg text-white">EXECUTIVE WAVE STRATEGIST</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Growth Opportunities Section */}
      <section className="py-24 relative bg-black" style={{
        backgroundImage: 'url("https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2961&q=80")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        <div className="container mx-auto px-5 max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="md:w-3/5 mb-10 md:mb-0">
              <h2 className="text-3xl md:text-4xl font-bold text-pink-300 mb-2">
                LEARN FROM THE WORLDS BEST
              </h2>
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
                GROWTH OPPORTUNITIES
              </h1>
              <div className="w-64 h-1 bg-purple-500 mb-8"></div>
              <p className="text-xl text-white leading-relaxed">
                Not only will you learn our AI tools and how to sell them... you'll also learn how to use some of the worlds largest AI tools from the Founders of our partner companies such as Clickup, SalesAi, Heygen, Mindpal and many more.
              </p>
            </div>
            <div className="md:w-2/5 flex justify-center">
              <div className="w-64 h-64">
                <img 
                  src="/growth-chart.png" 
                  alt="Growth Chart" 
                  className="w-full h-full"
                  onError={(e) => { 
                    e.target.onerror = null; 
                    e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%238EB8E5" width="100%" height="100%"><path d="M20.1,4h-1V3c0-0.55-0.45-1-1-1s-1,0.45-1,1v1H7V3c0-0.55-0.45-1-1-1S5,2.45,5,3v1H3.9C2.85,4,2,4.85,2,5.9v14.2c0,1.05,0.85,1.9,1.9,1.9h16.2c1.05,0,1.9-0.85,1.9-1.9V5.9C22,4.85,21.15,4,20.1,4z M20,20H4V8h16V20z M9.34,16.67l2.12-2.12l1.41,1.41l3.54-3.54l1.41,1.41L13.7,19l-1.41-1.41l-1.41,1.41L9.34,16.67z M9.34,10.67l2.12-2.12l1.41,1.41l3.54-3.54l1.41,1.41L13.7,13l-1.41-1.41l-1.41,1.41L9.34,10.67z"/></svg>';
                  }}
                  style={{filter: 'drop-shadow(0px 0px 10px rgba(142, 184, 229, 0.6))'}}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What's Possible Section */}
      <section className="py-24 relative bg-black" style={{
        backgroundImage: 'url("https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2961&q=80")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        <div className="container mx-auto px-5 max-w-6xl">
          {/* Main Heading */}
          <h2 className="text-5xl md:text-6xl font-bold text-white text-center mb-16">
            WHAT'S POSSIBLE
          </h2>
          
          {/* Two Column Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16">
            {/* Discover Column */}
            <div className="bg-gray-800 border-2 border-pink-300 rounded-xl p-8">
              <div className="flex items-center mb-8">
                <span className="text-pink-300 mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                    <path d="M11.7 2.805a.75.75 0 01.6 0A60.65 60.65 0 0122.83 8.72a.75.75 0 01-.231 1.337 49.949 49.949 0 00-9.902 3.912l-.003.002-.34.18a.75.75 0 01-.707 0A50.009 50.009 0 007.5 12.174v-.224c0-.131.067-.248.172-.311a54.614 54.614 0 014.653-2.52.75.75 0 00-.65-1.352 56.129 56.129 0 00-4.78 2.589 1.858 1.858 0 00-.859 1.228 49.803 49.803 0 00-4.634-1.527.75.75 0 01-.231-1.337A60.653 60.653 0 0111.7 2.805z" />
                    <path d="M13.06 15.473a48.45 48.45 0 017.666-3.282c.134 1.414.22 2.843.255 4.285a.75.75 0 01-.46.71 47.878 47.878 0 00-8.105 4.342.75.75 0 01-.832 0 47.877 47.877 0 00-8.104-4.342.75.75 0 01-.461-.71c.035-1.442.121-2.87.255-4.286A48.4 48.4 0 016 13.18v1.27a1.5 1.5 0 00-.14 2.508c-.09.38-.222.753-.397 1.11.452.213.901.434 1.346.661a6.729 6.729 0 00.551-1.608 1.5 1.5 0 00.14-2.67v-.645a48.549 48.549 0 013.44 1.668 2.25 2.25 0 002.12 0z" />
                    <path d="M4.462 19.462c.42-.419.753-.89 1-1.394.453.213.902.434 1.347.661a6.743 6.743 0 01-1.286 1.794.75.75 0 11-1.06-1.06z" />
                  </svg>
                </span>
                <h3 className="text-3xl font-bold text-white uppercase">DISCOVER</h3>
              </div>
              
              <ul className="space-y-4 text-xl text-white">
                <li className="flex items-start">
                  <span className="text-pink-300 mr-2 mt-1">›</span>
                  <span>How to monetize AI</span>
                </li>
                <li className="flex items-start">
                  <span className="text-pink-300 mr-2 mt-1">›</span>
                  <span>Leveraging AI to get leads</span>
                </li>
                <li className="flex items-start">
                  <span className="text-pink-300 mr-2 mt-1">›</span>
                  <span>Automating conversations with AI</span>
                </li>
                <li className="flex items-start">
                  <span className="text-pink-300 mr-2 mt-1">›</span>
                  <span>AI Driven Profitable Sales Funnels</span>
                </li>
                <li className="flex items-start">
                  <span className="text-pink-300 mr-2 mt-1">›</span>
                  <span>Learning The Hottest AI Tools</span>
                </li>
              </ul>
            </div>
            
            {/* Growth Column */}
            <div className="bg-gray-800 border-2 border-pink-300 rounded-xl p-8">
              <div className="flex items-center mb-8">
                <span className="text-pink-300 mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                    <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 010 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 01-1.422 0l-.395-1.183a1.5 1.5 0 00-.948-.948l-1.183-.395a.75.75 0 010-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0116.5 15z" clipRule="evenodd" />
                  </svg>
                </span>
                <h3 className="text-3xl font-bold text-white uppercase">GROWTH</h3>
              </div>
              
              <ul className="space-y-4 text-xl text-white">
                <li className="flex items-start">
                  <span className="text-pink-300 mr-2 mt-1">›</span>
                  <span>Using AI as a non-techy</span>
                </li>
                <li className="flex items-start">
                  <span className="text-pink-300 mr-2 mt-1">›</span>
                  <span>Unlimited reach potential</span>
                </li>
                <li className="flex items-start">
                  <span className="text-pink-300 mr-2 mt-1">›</span>
                  <span>Free up time</span>
                </li>
                <li className="flex items-start">
                  <span className="text-pink-300 mr-2 mt-1">›</span>
                  <span>Increasing ROI</span>
                </li>
                <li className="flex items-start">
                  <span className="text-pink-300 mr-2 mt-1">›</span>
                  <span>Monetizing The AI Wave</span>
                </li>
              </ul>
            </div>
          </div>
          
          {/* And Much More */}
          <div className="text-center mb-16">
            <h3 className="text-5xl font-bold text-white">...AND MUCH MORE</h3>
          </div>

          {/* CTA Button */}
          <div className="text-center">
            <button 
              onClick={() => document.dispatchEvent(new CustomEvent('open-signup-modal'))}
              className="px-16 py-6 bg-blue-400 hover:bg-blue-500 text-white rounded-xl font-bold text-3xl transition-all inline-flex items-center"
            >
              START FREE TRIAL
            </button>
          </div>
        </div>
      </section>

      {/* Program Features Section */}
      <section className="py-16 relative bg-black" style={{
        backgroundImage: 'url("https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2961&q=80")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        <div className="container mx-auto px-5 max-w-6xl py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24">
            {/* Feature 1 - Training Portal */}
            <div className="bg-white rounded-xl overflow-hidden p-8 shadow-lg h-auto max-w-md mx-auto" style={{boxShadow: '0 4px 15px rgba(0, 0, 0, 0.25)'}}>
              <div className="flex flex-col items-center">
                <div className="mb-8 relative inline-block w-full">
                  <div className="relative mx-auto max-w-[320px]">
                    <div className="border-[6px] border-gray-800 rounded-2xl overflow-hidden shadow-lg relative aspect-[4/3]">
                      <img 
                        src="/training-portal.png" 
                        alt="Training Portal" 
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = 'https://placehold.co/600x400/444/white?text=Training+Portal'; }}
                      />
                      <div className="absolute -right-3 -top-3 w-12 h-12 bg-pink-400 rounded-full flex items-center justify-center z-10" style={{pointerEvents: 'none'}}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                          <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="text-center">
                  <h3 className="text-[1.3rem] font-bold mb-4 text-gray-900 uppercase tracking-wide">
                    TRAINING PORTAL
                  </h3>
                  
                  <p className="text-[1.1rem] text-gray-700 leading-relaxed px-2">
                    Log into our portal where we store our training curriculums & replays of all of our live classes for you to watch at your convenience. Learn different systems & strategies to help you sell AI to businesses.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 2 - Private Online Community */}
            <div className="bg-white rounded-xl overflow-hidden p-8 shadow-lg md:mt-20 h-auto max-w-md mx-auto" style={{boxShadow: '0 4px 15px rgba(0, 0, 0, 0.25)'}}>
              <div className="flex flex-col items-center">
                <div className="mb-8 relative inline-block w-full">
                  <div className="relative mx-auto max-w-[320px]">
                    <div className="border-[6px] border-gray-800 rounded-2xl overflow-hidden shadow-lg relative aspect-[4/3]">
                      <img 
                        src="/online-community.png" 
                        alt="Private Online Community" 
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = 'https://placehold.co/600x400/444/white?text=Online+Community'; }}
                      />
                      <div className="absolute -right-3 -top-3 w-12 h-12 bg-pink-400 rounded-full flex items-center justify-center z-10" style={{pointerEvents: 'none'}}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                          <path fillRule="evenodd" d="M8.25 6.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM15.75 9.75a3 3 0 116 0 3 3 0 01-6 0zM2.25 9.75a3 3 0 116 0 3 3 0 01-6 0zM6.31 15.117A6.745 6.745 0 0112 12a6.745 6.745 0 016.709 7.498.75.75 0 01-.372.568A12.696 12.696 0 0112 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 01-.372-.568 6.787 6.787 0 011.019-4.38z" clipRule="evenodd" />
                          <path d="M5.082 14.254a8.287 8.287 0 00-1.308 5.135 9.687 9.687 0 01-1.764-.44l-.115-.04a.563.563 0 01-.373-.487l-.01-.121a3.75 3.75 0 013.57-4.047zM20.226 19.389a8.287 8.287 0 00-1.308-5.135 3.75 3.75 0 013.57 4.047l-.01.121a.563.563 0 01-.373.486l-.115.04c-.567.2-1.156.349-1.764.441z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="text-center">
                  <h3 className="text-[1.3rem] font-bold mb-4 text-gray-900 uppercase tracking-wide">
                    PRIVATE ONLINE COMMUNITY
                  </h3>
                  
                  <p className="text-[1.1rem] text-gray-700 leading-relaxed px-2">
                    Ride the AI wave with a community of other AI Surfers that will inspire, motivate, and support you in every step of the way. Jump in at any time, get answers to all your questions, and start selling AI with ease.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 3 - In-Person & Online Classes */}
            <div className="bg-white rounded-xl overflow-hidden p-8 shadow-lg md:mt-0 h-auto max-w-md mx-auto" style={{boxShadow: '0 4px 15px rgba(0, 0, 0, 0.25)'}}>
              <div className="flex flex-col items-center">
                <div className="mb-8 relative inline-block w-full">
                  <div className="relative mx-auto max-w-[320px]">
                    <div className="border-[6px] border-gray-800 rounded-2xl overflow-hidden shadow-lg relative aspect-[4/3]">
                      <img 
                        src="/live-classes.png" 
                        alt="In-Person & Online Classes" 
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = 'https://placehold.co/600x400/444/white?text=Live+Classes'; }}
                      />
                      <div className="absolute -right-3 -top-3 w-12 h-12 bg-pink-400 rounded-full flex items-center justify-center z-10" style={{pointerEvents: 'none'}}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                          <path fillRule="evenodd" d="M2.25 5.25a3 3 0 013-3h13.5a3 3 0 013 3V15a3 3 0 01-3 3h-3v.257c0 .597.237 1.17.659 1.591l.621.622a.75.75 0 01-.53 1.28h-9a.75.75 0 01-.53-1.28l.621-.622a2.25 2.25 0 00.659-1.59V18h-3a3 3 0 01-3-3V5.25zm1.5 0v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="text-center">
                  <h3 className="text-[1.3rem] font-bold mb-4 text-gray-900 uppercase tracking-wide">
                    IN-PERSON & ONLINE CLASSES
                  </h3>
                  
                  <p className="text-[1.1rem] text-gray-700 leading-relaxed px-2">
                    Experience our weekly live online classes with the world's top AI experts showing you the newest AI tools, and how to begin selling them to businesses so you can scale faster while working less.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 4 - Convertwave & Remixer Software */}
            <div className="bg-white rounded-xl overflow-hidden p-8 shadow-lg md:mt-20 h-auto max-w-md mx-auto" style={{boxShadow: '0 4px 15px rgba(0, 0, 0, 0.25)'}}>
              <div className="flex flex-col items-center">
                <div className="mb-8 relative inline-block w-full">
                  <div className="relative mx-auto max-w-[320px]">
                    <div className="border-[6px] border-gray-800 rounded-2xl overflow-hidden shadow-lg relative aspect-[4/3]">
                      <img 
                        src="/automation-software.png" 
                        alt="Convertwave & Remixer Software" 
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = 'https://placehold.co/600x400/444/white?text=Business+Management+Software'; }}
                      />
                      <div className="absolute -right-3 -top-3 w-12 h-12 bg-pink-400 rounded-full flex items-center justify-center z-10" style={{pointerEvents: 'none'}}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                          <path d="M17.004 10.407c.138.435-.216.842-.672.842h-3.465a.75.75 0 01-.65-.375l-1.732-3c-.229-.396-.053-.907.393-1.004a5.252 5.252 0 016.126 3.537zM8.12 8.464c.307-.338.838-.235 1.066.16l1.732 3a.75.75 0 010 .75l-1.732 3.001c-.229.396-.76.498-1.067.16A5.231 5.231 0 016.75 12c0-1.362.519-2.603 1.37-3.536zM10.878 17.13c-.447-.097-.623-.608-.394-1.003l1.733-3.003a.75.75 0 01.65-.375h3.465c.457 0 .81.408.672.843a5.252 5.252 0 01-6.126 3.538z" />
                          <path fillRule="evenodd" d="M21 12.75a.75.75 0 000-1.5h-.783a8.22 8.22 0 00-.237-1.357l.734-.267a.75.75 0 10-.513-1.41l-.735.268a8.24 8.24 0 00-.689-1.191l.6-.504a.75.75 0 10-.964-1.149l-.6.504a8.3 8.3 0 00-1.054-.885l.391-.678a.75.75 0 10-1.299-.75l-.39.677a8.188 8.188 0 00-1.295-.471l.136-.77a.75.75 0 00-1.477-.26l-.136.77a8.364 8.364 0 00-1.377 0l-.136-.77a.75.75 0 10-1.477.26l.136.77c-.448.121-.88.28-1.294.47l-.39-.676a.75.75 0 00-1.3.75l.392.678a8.29 8.29 0 00-1.054-.885l.601.504a.75.75 0 10.964-1.15l-.6-.503a8.24 8.24 0 00.69-1.191l.735.268a.75.75 0 10.512-1.41l-.734-.268c.115-.438.195-.892.237-1.356h.784zm-2.657-3.06a6.744 6.744 0 00-1.19-2.053 6.784 6.784 0 00-1.82-1.51A6.704 6.704 0 0012 5.25a6.801 6.801 0 00-1.225.111 6.7 6.7 0 00-2.15.792 6.784 6.784 0 00-2.952 3.489.758.758 0 01-.036.099A6.74 6.74 0 005.251 12a6.739 6.739 0 003.355 5.835l.01.006.01.005a6.706 6.706 0 002.203.802c.007 0 .014.002.021.004a6.792 6.792 0 002.301 0l.022-.004a6.707 6.707 0 002.228-.816 6.781 6.781 0 001.762-1.483l.009-.01.009-.012a6.744 6.744 0 001.18-2.064c.253-.708.39-1.47.39-2.264a6.74 6.74 0 00-.408-2.308z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="text-center">
                  <h3 className="text-[1.3rem] font-bold mb-4 text-gray-900 uppercase tracking-wide">
                    CONVERTWAVE & REMIXER SOFTWARE
                  </h3>
                  
                  <p className="text-[1.1rem] text-gray-700 leading-relaxed px-2">
                    Your membership includes our Convertwave software which acts as your one stop shop for all the tools needed to run your personal business, including a CRM, AI agents, AI funnel builder, AI conversation manager, calendar system, AI automations hub and much more. Remixer will help you create viral content online through our proprietary AI social media growth strategy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action - Two Options */}
      <section className={`py-20 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Option 1: Join Now */}
            <div className="bg-white rounded-3xl shadow-xl p-10 border-2 border-gray-100 transform transition-transform hover:scale-105">
              <h3 className="text-3xl font-bold mb-8">
                <span className="text-red-300">Option 1:</span> <span className="text-gray-900">Join Now</span>
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
                    <FaCheck className="text-red-400 text-sm" />
                  </div>
                  <p className="ml-3 text-gray-700 font-medium">Be part of the top 1% of businesses selling AI.</p>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
                    <FaCheck className="text-red-400 text-sm" />
                  </div>
                  <p className="ml-3 text-gray-700 font-medium">
                    Discover the quick and easy way to scale with AI (even if you're not a "techy" person)
                  </p>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
                    <FaCheck className="text-red-400 text-sm" />
                  </div>
                  <p className="ml-3 text-gray-700 font-medium">
                    Skyrocket your profits while saving more time and working less with AI.
                  </p>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
                    <FaCheck className="text-red-400 text-sm" />
                  </div>
                  <p className="ml-3 text-gray-700 font-medium">
                    Stay ahead of your competition by selling AI before them.
                  </p>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
                    <FaCheck className="text-red-400 text-sm" />
                  </div>
                  <p className="ml-3 text-gray-700 font-medium">
                    Get exclusive access to the world's top AI company owners.
            </p>
          </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
                    <FaCheck className="text-red-400 text-sm" />
                  </div>
                  <p className="ml-3 text-gray-700 font-medium">
                    Connect with other business owners thrilled to sell AI.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Option 2: Exit This Page */}
            <div className="bg-white rounded-3xl shadow-xl p-10 border-2 border-gray-100 transform transition-transform hover:scale-105">
              <h3 className="text-3xl font-bold mb-8">
                <span className="text-gray-900">Option 2:</span> <span className="text-gray-500">Exit This Page</span>
                    </h3>
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mt-0.5">
                    <FaCheck className="text-gray-600 text-sm" />
                  </div>
                  <p className="ml-3 text-gray-700 font-medium">
                    Stay in the same spot you currently are and nothing changes.
                  </p>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mt-0.5">
                    <FaCheck className="text-gray-600 text-sm" />
                  </div>
                  <p className="ml-3 text-gray-700 font-medium">
                    Try to navigate AI on your own, overwhelmed, lost, not knowing which tools to sell.
                  </p>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mt-0.5">
                    <FaCheck className="text-gray-600 text-sm" />
                  </div>
                  <p className="ml-3 text-gray-700 font-medium">
                    Missing out on key connections with the world's top AI company owners.
                  </p>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mt-0.5">
                    <FaCheck className="text-gray-600 text-sm" />
                  </div>
                  <p className="ml-3 text-gray-700 font-medium">
                    Wasting time on manual and repetitive tasks and doing things the same old way.
                  </p>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mt-0.5">
                    <FaCheck className="text-gray-600 text-sm" />
                  </div>
                  <p className="ml-3 text-gray-700 font-medium">
                    Seeing how your competitors start to sell AI faster than you while working less hours.
                  </p>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mt-0.5">
                    <FaCheck className="text-gray-600 text-sm" />
                  </div>
                  <p className="ml-3 text-gray-700 font-medium">
                    Never knowing how much your life could have improved if you sold AI before anyone else, missing out on a once in a lifetime wave of opportunity.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <button 
              onClick={() => document.dispatchEvent(new CustomEvent('open-signup-modal'))}
              className="px-10 py-4 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold text-xl transition-all inline-flex items-center"
            >
              JOIN NOW AND START YOUR FREE TRIAL
              <FaArrowRight className="ml-3" />
            </button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className={`py-20 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              FREQUENTLY ASKED QUESTIONS
            </h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {/* FAQ Item 1 */}
            <details className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} cursor-pointer group`}>
              <summary className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-800'} flex justify-between items-center`}>
                Will I still get value from this if I hate tech and I'm not good with it?
                <svg className="w-5 h-5 transition-transform transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className={`mt-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <p>Absolutely! Our program is specifically designed for people who aren't technical. We focus on teaching you the business side of AI - how to sell, position, and monetize AI solutions without needing to understand the technical aspects. We provide templates, scripts, and step-by-step guidance that anyone can follow.</p>
              </div>
            </details>

            {/* FAQ Item 2 */}
            <details className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} cursor-pointer group`}>
              <summary className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-800'} flex justify-between items-center`}>
                What can I do if I'm too busy to attend all the weekly calls?
                <svg className="w-5 h-5 transition-transform transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className={`mt-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <p>We record all calls and make them available in our member portal within 24 hours. You can watch the replays at your convenience and still get full value from the program. We also provide action guides for each module so you can implement what you learn on your own schedule.</p>
              </div>
            </details>

            {/* FAQ Item 3 */}
            <details className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} cursor-pointer group`}>
              <summary className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-800'} flex justify-between items-center`}>
                We get a full business management software included when we get started?
                <svg className="w-5 h-5 transition-transform transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className={`mt-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <p>Yes! When you join our program, you get access to our complete business management software suite which includes CRM, invoicing, client management, project tracking, and AI tools integration. This software normally sells for $197/month, but it's included at no extra cost with your membership.</p>
              </div>
            </details>

            {/* FAQ Item 4 */}
            <details className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} cursor-pointer group`}>
              <summary className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-800'} flex justify-between items-center`}>
                I want my team to go through the program. What options do I have?
                <svg className="w-5 h-5 transition-transform transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className={`mt-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <p>We offer team packages that provide additional licenses at a discounted rate. You can add team members to your account, and they'll get access to all the training materials, resources, and software. Each team member gets their own login and can progress through the program at their own pace.</p>
              </div>
            </details>

            {/* FAQ Item 5 */}
            <details className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} cursor-pointer group`}>
              <summary className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-800'} flex justify-between items-center`}>
                How do I know the tools and methods you'll share with me are useful?
                <svg className="w-5 h-5 transition-transform transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className={`mt-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <p>Everything we teach has been battle-tested in the real world with real clients. Our strategies have generated millions in revenue for our students. We constantly update our curriculum based on what's working right now, and we provide case studies and examples of successful implementations. Plus, you can see our testimonials from students who have already achieved success with our methods.</p>
              </div>
            </details>

            {/* FAQ Item 6 */}
            <details className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} cursor-pointer group`}>
              <summary className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-800'} flex justify-between items-center`}>
                What's the price for the program? What options do I have to pay for it?
                <svg className="w-5 h-5 transition-transform transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className={`mt-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <p>We offer several pricing tiers to fit different needs and budgets. Our standard program starts at $1,997 or 12 monthly payments of $197. We also offer a premium tier with additional 1-on-1 support and a VIP tier that includes done-for-you services. All plans come with a 14-day money-back guarantee so you can try it risk-free.</p>
              </div>
            </details>

            {/* FAQ Item 7 */}
            <details className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} cursor-pointer group`}>
              <summary className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-800'} flex justify-between items-center`}>
                Do you teach new things to keep up to date on AI?
                <svg className="w-5 h-5 transition-transform transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className={`mt-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <p>Absolutely! AI is evolving rapidly, and we're committed to keeping our members on the cutting edge. We provide weekly updates on new AI tools and opportunities, monthly masterclasses on emerging AI trends, and quarterly curriculum updates to incorporate the latest strategies. Your membership includes lifetime updates, so you'll always have access to the newest information.</p>
              </div>
            </details>
          </div>

          <div className="text-center mt-16">
            <div className="bg-blue-400 hover:bg-blue-500 inline-block transition-all rounded-xl shadow-lg overflow-hidden">
              <button 
                onClick={() => document.dispatchEvent(new CustomEvent('open-signup-modal'))}
                className="px-16 py-6 font-bold text-2xl text-white"
              >
                START FREE TRIAL
              </button>
              <div className="bg-blue-500 text-white text-sm py-2">
                Bonuses Included
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage; 