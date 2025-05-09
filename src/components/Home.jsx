import React, { useState, useEffect } from 'react';
import { HashLoader } from 'react-spinners';
import { FaRobot, FaTools, FaLightbulb, FaCalendarAlt, FaArrowRight, FaUserGraduate, FaChartLine } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

const Home = () => {
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
      name: "Sarah Johnson",
      role: "Marketing Director",
      text: "AI Waverider transformed our business workflows. The AI agents saved us countless hours of manual work.",
      image: "https://randomuser.me/api/portraits/women/44.jpg"
    },
    {
      name: "Michael Chen",
      role: "Tech Entrepreneur",
      text: "The personalized AI coaching gave me clarity on how to implement AI solutions for my startup.",
      image: "https://randomuser.me/api/portraits/men/32.jpg"
    },
    {
      name: "Emily Rodriguez",
      role: "Content Creator",
      text: "The AI tools recommended by AI Waverider have helped me create better content in half the time.",
      image: "https://randomuser.me/api/portraits/women/68.jpg"
    }
  ];
  
  return (
    <div className={`${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}>
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-500 to-indigo-700 opacity-90"></div>
        <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-20"></div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 md:pr-12">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-white leading-tight">
                Navigate the <span className="bg-gradient-to-r from-teal-400 to-blue-400 text-transparent bg-clip-text">AI Revolution</span> with Confidence
              </h1>
              <p className="text-xl text-gray-200 mb-8">
                Master cutting-edge AI tools, implement powerful AI agents, and transform your business with expert guidance.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/agents" className="px-8 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition-all flex items-center justify-center">
                  Explore AI Agents <FaArrowRight className="ml-2" />
                </Link>
                <a href="#book-session" className="px-8 py-3 bg-white text-purple-700 hover:bg-gray-100 rounded-lg font-medium transition-all flex items-center justify-center">
                  Book a Consultation <FaCalendarAlt className="ml-2" />
                </a>
              </div>
            </div>
            <div className="md:w-1/2 mt-12 md:mt-0">
              <div className="relative">
                <div className="absolute -top-5 -left-5 w-24 h-24 bg-blue-500 rounded-full opacity-20 animate-pulse"></div>
                <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-purple-500 rounded-full opacity-20 animate-pulse delay-300"></div>
                <img src="/hero-image.webp" alt="AI Technology" className="relative z-10 rounded-xl shadow-2xl max-w-full h-auto" onError={(e) => { e.target.src = 'https://placehold.co/600x400/444/white?text=AI+Wave+Rider'; }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What We Offer Section */}
      <section className={`py-20 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`} id="services">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Transforming Businesses with AI
            </h2>
            <p className={`max-w-2xl mx-auto text-xl ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Discover our comprehensive suite of AI solutions designed to power your success.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {/* Card 1 */}
            <div className={`rounded-xl p-8 transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-50 shadow-md'}`}>
              <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl mb-6">
                <FaRobot />
              </div>
              <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                AI Agents & Automation
              </h3>
              <p className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Custom AI agents that automate repetitive tasks, streamline workflows, and increase productivity across your organization.
              </p>
              <Link to="/agents" className="inline-flex items-center text-blue-500 hover:text-blue-600 font-medium">
                Explore Agents <FaArrowRight className="ml-2" />
              </Link>
            </div>

            {/* Card 2 */}
            <div className={`rounded-xl p-8 transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-50 shadow-md'}`}>
              <div className="w-14 h-14 rounded-full bg-purple-500 flex items-center justify-center text-white text-2xl mb-6">
                <FaTools />
              </div>
              <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Curated AI Tools
              </h3>
              <p className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Navigate the rapidly expanding AI landscape with our expert-curated directory of the most powerful and practical AI tools.
              </p>
              <Link to="/ai-tools" className="inline-flex items-center text-purple-500 hover:text-purple-600 font-medium">
                Discover Tools <FaArrowRight className="ml-2" />
              </Link>
            </div>

            {/* Card 3 */}
            <div className={`rounded-xl p-8 transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-50 shadow-md'}`}>
              <div className="w-14 h-14 rounded-full bg-teal-500 flex items-center justify-center text-white text-2xl mb-6">
                <FaUserGraduate />
              </div>
              <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                AI Strategy Consulting
              </h3>
              <p className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Personalized guidance on implementing AI in your business with custom strategies tailored to your specific industry and needs.
              </p>
              <a href="#book-session" className="inline-flex items-center text-teal-500 hover:text-teal-600 font-medium">
                Get Started <FaArrowRight className="ml-2" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* AI Tools Spotlight */}
      <section className={`py-20 ${darkMode ? 'bg-gray-900' : 'bg-white'}`} id="tools">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 md:pr-12 mb-12 md:mb-0">
              <h2 className={`text-3xl md:text-4xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Stay Ahead with the Latest AI Tools
              </h2>
              <p className={`text-xl mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                The AI landscape evolves daily. We curate and review the latest tools to help you find exactly what you need.
              </p>
              <ul className={`space-y-4 mb-8 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white mr-3">✓</div>
                  <span>Content generation and AI writing assistants</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white mr-3">✓</div>
                  <span>Image, video, and audio creation tools</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white mr-3">✓</div>
                  <span>Data analysis and business intelligence</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white mr-3">✓</div>
                  <span>Automation and workflow optimization</span>
                </li>
              </ul>
              <Link to="/ai-tools" className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all inline-flex items-center">
                Explore AI Tools <FaArrowRight className="ml-2" />
              </Link>
            </div>
            <div className="md:w-1/2">
              <div className="grid grid-cols-2 gap-6">
                <div className={`rounded-xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center text-white text-xl mb-4">
                    <FaLightbulb />
                  </div>
                  <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    AI for Content Creation
                  </h3>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Generate blog posts, emails, and marketing copy with AI.
                  </p>
                </div>
                <div className={`rounded-xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="w-12 h-12 rounded-lg bg-teal-500 flex items-center justify-center text-white text-xl mb-4">
                    <FaChartLine />
                  </div>
                  <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    AI for Analytics
                  </h3>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Turn data into actionable insights automatically.
                  </p>
                </div>
                <div className={`rounded-xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="w-12 h-12 rounded-lg bg-purple-500 flex items-center justify-center text-white text-xl mb-4">
                    <FaRobot />
                  </div>
                  <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    AI for Customer Service
                  </h3>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Automate support with intelligent chatbots.
                  </p>
                </div>
                <div className={`rounded-xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center text-white text-xl mb-4">
                    <FaTools />
                  </div>
                  <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    AI for Development
                  </h3>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Code faster with AI pair programming tools.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className={`py-20 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`} id="testimonials">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              What Our Clients Say
            </h2>
            <p className={`max-w-2xl mx-auto text-xl ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Hear from businesses and individuals who've transformed their work with AI Waverider.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className={`rounded-xl p-8 ${darkMode ? 'bg-gray-700' : 'bg-white shadow-md'}`}>
                <div className="flex items-center mb-6">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.name} 
                    className="w-16 h-16 rounded-full object-cover mr-4" 
                  />
                  <div>
                    <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {testimonial.name}
                    </h3>
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {testimonial.role}
                    </p>
                  </div>
                </div>
                <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} italic`}>
                  "{testimonial.text}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Book a Session */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-purple-700 text-white" id="book-session">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Master AI for Your Business?
            </h2>
            <p className="max-w-2xl mx-auto text-xl text-blue-100">
              Book a personalized consultation to discuss your AI needs and discover how our solutions can help you achieve your goals.
            </p>
          </div>

          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-10 bg-gradient-to-br from-blue-600 to-purple-700">
                <h3 className="text-2xl font-bold text-white mb-4">Book Your AI Strategy Session</h3>
                <ul className="space-y-4 text-white">
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-300 flex items-center justify-center text-blue-700 text-xs mr-3">✓</div>
                    <span>Personalized AI strategy consultation</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-300 flex items-center justify-center text-blue-700 text-xs mr-3">✓</div>
                    <span>Custom AI agent recommendations</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-300 flex items-center justify-center text-blue-700 text-xs mr-3">✓</div>
                    <span>AI tool selection guidance</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-300 flex items-center justify-center text-blue-700 text-xs mr-3">✓</div>
                    <span>30-minute expert strategy session</span>
                  </li>
                </ul>
              </div>
              <div className="p-10 bg-white">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Schedule Your Session</h3>
                <p className="text-gray-600 mb-8">
                  Choose a time that works for you and book your 30-minute consultation with our AI experts.
                </p>
                <a 
                  href="https://calendly.com/your-booking-link" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all flex items-center justify-center heartbeat-pulse"
                >
                  <FaCalendarAlt className="mr-2" />
                  Book Your Session Now
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className={`py-16 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="container mx-auto px-6 text-center">
          <h2 className={`text-2xl md:text-3xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Start Your AI Journey Today
          </h2>
          <p className={`max-w-2xl mx-auto text-lg mb-8 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Join the hundreds of businesses and individuals who have transformed their work with AI Waverider.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/agents" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all">
              Explore AI Agents
            </Link>
            <Link to="/ai-tools" className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all">
              Browse AI Tools
            </Link>
            <a href="#book-session" className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-all">
              Book a Consultation
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
