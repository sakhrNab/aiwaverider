import React from 'react';
import { FaLinkedin, FaGithub, FaTwitter, FaGlobe, FaCode, FaLaptopCode, FaRobot, FaChartLine, FaBrain, FaTools } from 'react-icons/fa';
import { useTheme } from '../contexts/ThemeContext';
import sakhrProfileImg from '../assets/sakhr-profile.jpg';
import tazProfileImg from '../assets/taz-profile.jpg';

const About = () => {
  const { darkMode } = useTheme();

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}>
      {/* Hero Section */}
      <section className={`py-16 ${darkMode ? 'bg-gray-800' : 'bg-gradient-to-r from-indigo-50 to-blue-50'}`}>
        <div className="container mx-auto px-6">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-teal-400">
                About AI Waverider
              </span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 leading-relaxed">
              Building the bridge between cutting-edge AI technology and practical business applications.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className={`py-14 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className={`text-3xl font-bold mb-8 text-center ${darkMode ? 'text-teal-300' : 'text-teal-600'}`}>Our Mission</h2>
            <p className="text-lg mb-6 leading-relaxed">
              AI Waverider was founded with a clear mission: to democratize access to artificial intelligence technologies 
              and help businesses and individuals harness the power of AI without requiring deep technical expertise.
            </p>
            <p className="text-lg mb-6 leading-relaxed">
              We believe that AI should be accessible to everyone, regardless of their technical background. Our platform
              provides the tools, resources, and guidance needed to navigate the rapidly evolving AI landscape and
              turn these powerful technologies into practical, profitable business solutions.
            </p>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className={`py-14 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <div className="container mx-auto px-6">
          <h2 className={`text-3xl font-bold mb-12 text-center ${darkMode ? 'text-teal-300' : 'text-teal-600'}`}>Our Values</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'} shadow-lg`}>
              <div className={`w-14 h-14 rounded-full ${darkMode ? 'bg-teal-600' : 'bg-teal-500'} flex items-center justify-center mb-4 text-white text-2xl`}>
                <FaRobot />
              </div>
              <h3 className="text-xl font-bold mb-3">Innovation</h3>
              <p>We constantly explore the cutting edge of AI technology to bring you the most powerful and effective solutions.</p>
            </div>
            
            <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'} shadow-lg`}>
              <div className={`w-14 h-14 rounded-full ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} flex items-center justify-center mb-4 text-white text-2xl`}>
                <FaLaptopCode />
              </div>
              <h3 className="text-xl font-bold mb-3">Accessibility</h3>
              <p>We believe in making AI understandable and usable for everyone, regardless of technical background.</p>
            </div>
            
            <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'} shadow-lg`}>
              <div className={`w-14 h-14 rounded-full ${darkMode ? 'bg-purple-600' : 'bg-purple-500'} flex items-center justify-center mb-4 text-white text-2xl`}>
                <FaBrain />
              </div>
              <h3 className="text-xl font-bold mb-3">Practical Application</h3>
              <p>We focus on real-world applications that deliver measurable value and tangible business results.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Founders Section */}
      <section className={`py-14 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="container mx-auto px-6">
          <h2 className={`text-3xl font-bold mb-12 text-center ${darkMode ? 'text-teal-300' : 'text-teal-600'}`}>Meet the Founders</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Sakhr Nabil */}
            <div className={`rounded-lg overflow-hidden shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} p-8`}>
              <div className="flex flex-col items-center">
                <div className="w-64 h-64 mb-6 rounded-full overflow-hidden bg-gradient-to-r from-blue-100 to-teal-100 p-1">
                  <img 
                    src={sakhrProfileImg} 
                    alt="Sakhr Nabil" 
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <h3 className="text-3xl font-bold mb-1 text-center">Sakhr Nabil</h3>
                <p className={`text-xl mb-4 ${darkMode ? 'text-teal-300' : 'text-teal-600'}`}>Co-Founder & CEO</p>
                <div className="flex justify-center space-x-6 mb-6">
                  <a href="https://linkedin.com/" target="_blank" rel="noopener noreferrer" className={`${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-blue-600'} text-2xl`}>
                    <FaLinkedin />
                  </a>
                  <a href="https://github.com/" target="_blank" rel="noopener noreferrer" className={`${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} text-2xl`}>
                    <FaGithub />
                  </a>
                  <a href="https://twitter.com/" target="_blank" rel="noopener noreferrer" className={`${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-blue-400'} text-2xl`}>
                    <FaTwitter />
                  </a>
                </div>
              </div>
              <p className="text-base leading-relaxed mb-4">
                Sakhr is a technology entrepreneur with over 10 years of experience in software development and AI implementation. 
                He has successfully helped dozens of businesses integrate AI solutions to optimize processes, reduce costs, and create 
                new revenue streams.
              </p>
              <p className="text-base leading-relaxed">
                With a background in computer science and business administration, Sakhr bridges the gap between 
                cutting-edge technology and practical business applications, making complex AI concepts accessible to everyone.
              </p>
            </div>
            
            {/* Mutaz Awn */}
            <div className={`rounded-lg overflow-hidden shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} p-8`}>
              <div className="flex flex-col items-center">
                <div className="w-64 h-64 mb-6 rounded-full overflow-hidden bg-gradient-to-r from-blue-100 to-teal-100 p-1">
                  <img 
                    src={tazProfileImg} 
                    alt="Mutaz Awn" 
                    className="w-full h-full rounded-full object-cover object-top"
                  />
                </div>
                <h3 className="text-3xl font-bold mb-1 text-center">Mutaz Awn</h3>
                <p className={`text-xl mb-4 ${darkMode ? 'text-teal-300' : 'text-teal-600'}`}>Co-Founder & CTO</p>
                <div className="flex justify-center space-x-6 mb-6">
                  <a href="https://linkedin.com/" target="_blank" rel="noopener noreferrer" className={`${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-blue-600'} text-2xl`}>
                    <FaLinkedin />
                  </a>
                  <a href="https://github.com/" target="_blank" rel="noopener noreferrer" className={`${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} text-2xl`}>
                    <FaGithub />
                  </a>
                  <a href="https://twitter.com/" target="_blank" rel="noopener noreferrer" className={`${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-blue-400'} text-2xl`}>
                    <FaTwitter />
                  </a>
                </div>
              </div>
              <p className="text-base leading-relaxed mb-4">
                Mutaz is an AI specialist and full-stack developer with expertise in machine learning, natural language 
                processing, and AI-powered automation. He has developed innovative AI solutions for startups and 
                enterprises across multiple industries.
              </p>
              <p className="text-base leading-relaxed">
                With a passion for making technology accessible, Mutaz focuses on creating user-friendly AI tools and 
                providing clear, actionable guidance that helps businesses implement AI solutions without requiring 
                extensive technical resources.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Waverider Platform */}
      <section className={`py-14 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className={`text-3xl font-bold mb-8 text-center ${darkMode ? 'text-teal-300' : 'text-teal-600'}`}>
              The AI Waverider Platform
            </h2>
            <p className="text-lg mb-6 leading-relaxed">
              AI Waverider is more than just a website – it's a comprehensive platform designed to help you navigate 
              the world of artificial intelligence and find the right AI solutions for your business needs.
            </p>
            <p className="text-lg mb-8 leading-relaxed">
              Our platform offers a carefully curated marketplace of AI agents and tools, educational resources, 
              implementation guidance, and a supportive community of AI enthusiasts and professionals.
            </p>

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 mb-8`}>
              <div className={`p-5 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'} shadow`}>
                <h3 className="text-xl font-bold mb-3 flex items-center">
                  <FaRobot className={`mr-2 ${darkMode ? 'text-teal-300' : 'text-teal-600'}`} />
                  AI Agents Marketplace
                </h3>
                <p>
                  Discover and deploy pre-built AI agents that can automate tasks, enhance customer experiences, 
                  and streamline operations across your business.
                </p>
              </div>
              
              <div className={`p-5 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'} shadow`}>
                <h3 className="text-xl font-bold mb-3 flex items-center">
                  <FaTools className={`mr-2 ${darkMode ? 'text-teal-300' : 'text-teal-600'}`} />
                  AI Tools Directory
                </h3>
                <p>
                  Browse our extensive collection of AI tools categorized by function, industry, and use case to 
                  find the right solutions for your specific needs.
                </p>
              </div>
              
              <div className={`p-5 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'} shadow`}>
                <h3 className="text-xl font-bold mb-3 flex items-center">
                  <FaCode className={`mr-2 ${darkMode ? 'text-teal-300' : 'text-teal-600'}`} />
                  Implementation Resources
                </h3>
                <p>
                  Access guides, tutorials, and case studies that walk you through implementing AI solutions in 
                  your business without requiring deep technical knowledge.
                </p>
              </div>
              
              <div className={`p-5 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'} shadow`}>
                <h3 className="text-xl font-bold mb-3 flex items-center">
                  <FaChartLine className={`mr-2 ${darkMode ? 'text-teal-300' : 'text-teal-600'}`} />
                  Latest Technology Updates
                </h3>
                <p>
                  Stay informed about the newest developments in AI technology and learn how these advancements 
                  can be applied to solve real business challenges.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className={`py-14 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className={`text-3xl font-bold mb-8 ${darkMode ? 'text-teal-300' : 'text-teal-600'}`}>Get in Touch</h2>
            <p className="text-lg mb-8">
              Have questions about AI Waverider or want to learn more about how we can help your business leverage AI technology? 
              We'd love to hear from you!
            </p>
            <a 
              href="mailto:contact@aiwaverider.com" 
              className={`inline-block px-8 py-3 ${darkMode ? 
                'bg-teal-600 hover:bg-teal-700' : 
                'bg-teal-600 hover:bg-teal-700'} 
                text-white rounded-lg font-semibold transition duration-300`}
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About; 