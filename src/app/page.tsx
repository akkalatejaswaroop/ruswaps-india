"use client";
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Calculator, 
  FileText, 
  Shield, 
  Users, 
  BookOpen, 
  Scale, 
  Briefcase,
  Truck,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  Menu,
  X,
  ChevronRight,
  CheckCircle,
  Download,
  Share2,
  CreditCard
} from 'lucide-react';

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signupModal, setSignupModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Thank you for signing up! We will contact you soon.');
    setSignupModal(false);
    setFormData({ name: '', phone: '' });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed w-full bg-white/95 backdrop-blur-sm shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center gap-3">
                <Image src="/main_logo.jpg" alt="Ruswaps" width={32} height={32} className="h-8 object-contain" />
              </Link>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <a href="#home" className="text-gray-600 hover:text-primary transition">Home</a>
              <a href="#goals" className="text-gray-600 hover:text-primary transition">Our Goals</a>
              <a href="#calculators" className="text-gray-600 hover:text-primary transition">Calculators</a>
              <a href="#about" className="text-gray-600 hover:text-primary transition">About Us</a>
              <a href="#contact" className="text-gray-600 hover:text-primary transition">Contact</a>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              <Link href="/login" className="px-4 py-2 text-gray-600 hover:text-primary transition">Login</Link>
              <Link href="/dashboard" className="px-6 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-full hover:opacity-90 transition">
                Get Started
              </Link>
            </div>

            <button 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t">
            <div className="px-4 py-4 space-y-3">
              <a href="#home" className="block py-2 text-gray-600">Home</a>
              <a href="#goals" className="block py-2 text-gray-600">Our Goals</a>
              <a href="#calculators" className="block py-2 text-gray-600">Calculators</a>
              <a href="#about" className="block py-2 text-gray-600">About Us</a>
              <a href="#contact" className="block py-2 text-gray-600">Contact</a>
              <Link href="/login" className="block py-2 text-gray-600">Login</Link>
              <Link href="/dashboard" className="block py-2 bg-primary text-white text-center rounded-lg">
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="home" className="pt-16 min-h-screen flex items-center bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
                <span className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse"></span>
                India's First Web Application
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                MVA-EC Claims and <br />
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Disability Calculator
                </span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                India's first Web App for Accident Claims Compensation & Disability Calculations and other day to day needs for legal professionals and insurance officials.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/dashboard" className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-full font-semibold hover:opacity-90 transition shadow-lg shadow-primary/30">
                  Start Calculating <ChevronRight className="ml-2" size={20} />
                </Link>
                <button 
                  onClick={() => setSignupModal(true)}
                  className="inline-flex items-center px-8 py-4 border-2 border-primary text-primary rounded-full font-semibold hover:bg-primary hover:text-white transition"
                >
                  Sign Up Free
                </button>
              </div>
              <div className="flex items-center gap-8 pt-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">200K+</div>
                  <div className="text-sm text-gray-500">Death Cases</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-secondary">50K+</div>
                  <div className="text-sm text-gray-500">Injuries</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">10K+</div>
                  <div className="text-sm text-gray-500">Users</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl blur-3xl"></div>
              <div className="relative bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
                <div className="bg-gradient-to-br from-primary to-secondary rounded-2xl p-1">
                  <div className="bg-white rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Calculator className="text-primary" size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">Quick Calculator</h3>
                        <p className="text-sm text-gray-500">Instant Results</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <div className="text-sm text-gray-500">Motor Vehicle Accident</div>
                        <div className="text-2xl font-bold text-primary">₹8,00,000+</div>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <div className="text-sm text-gray-500">Workmen Compensation</div>
                        <div className="text-2xl font-bold text-secondary">₹5,00,000+</div>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <div className="text-sm text-gray-500">Disability Assessment</div>
                        <div className="text-2xl font-bold text-primary">100%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Goals Section */}
      <section id="goals" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Our <span className="text-primary">Goal</span>
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Empowering legal professionals and insurance officials with accurate calculations
            </p>
          </div>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl p-8">
                <div className="w-full h-full bg-white rounded-2xl shadow-lg flex items-center justify-center">
                  <div className="text-center p-8">
                    <Shield className="w-24 h-24 text-primary mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900">MVA-EC Claims Calc</h3>
                    <p className="text-gray-500 mt-2">Simple & Friendly Interface</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <p className="text-gray-600 leading-relaxed">
                Our main goal is to help legal professionals and General insurance officials who are dealing accident compensation claims and disability calculations with minimum anticipation.
              </p>
              <p className="text-gray-600 leading-relaxed">
                The "MVA-EC Claims Calc" Web Application was made with simple and friendly user interface. The interface allows you to conduct calculations in seconds, and without mistakes.
              </p>
              <p className="text-gray-600 leading-relaxed">
                All features are free for 30 days to experience the services offered. Annual subscription is very meager.
              </p>
              <div className="flex flex-wrap gap-3 pt-4">
                <span className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm">Accurate</span>
                <span className="px-4 py-2 bg-secondary/10 text-secondary rounded-full text-sm">Fast</span>
                <span className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm">Reliable</span>
                <span className="px-4 py-2 bg-secondary/10 text-secondary rounded-full text-sm">PDF Export</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Calculators Section */}
      <section id="calculators" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              App <span className="text-primary">Calculators</span>
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Comprehensive suite of calculators for all your needs
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg card-hover border border-gray-100">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <Truck className="text-primary" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Third Party Compensation Claims</h3>
              <p className="text-gray-600 mb-4">
                Motor Vehicle Accident Claims Compensation for Death & Injury for Married, Bachelors & Minors.
              </p>
              <Link href="/calculators/mva-claims" className="inline-flex items-center text-primary font-medium hover:gap-2 transition-all">
                Calculate Now <ChevronRight size={18} />
              </Link>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg card-hover border border-gray-100">
              <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center mb-6">
                <Briefcase className="text-secondary" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Employee Compensation Claims</h3>
              <p className="text-gray-600 mb-4">
                Workplace Accidents compensation for Death & Injuries under Workmen Compensation Act.
              </p>
              <Link href="/calculators/employee-compensation" className="inline-flex items-center text-primary font-medium hover:gap-2 transition-all">
                Calculate Now <ChevronRight size={18} />
              </Link>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg card-hover border border-gray-100">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <Scale className="text-primary" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Disability Calculations</h3>
              <p className="text-gray-600 mb-4">
                Whole body Loco-Motor disability for Upper & Lower Extremities and Spine Traumatic Lesions.
              </p>
              <Link href="/calculators/disability" className="inline-flex items-center text-primary font-medium hover:gap-2 transition-all">
                Calculate Now <ChevronRight size={18} />
              </Link>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg card-hover border border-gray-100">
              <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center mb-6">
                <CreditCard className="text-secondary" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Income-Tax on Interest</h3>
              <p className="text-gray-600 mb-4">
                Calculation of Interest on Award amount for PAN and No-PAN holders.
              </p>
              <Link href="/calculators/income-tax" className="inline-flex items-center text-primary font-medium hover:gap-2 transition-all">
                Calculate Now <ChevronRight size={18} />
              </Link>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg card-hover border border-gray-100">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <Calculator className="text-primary" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Age Calculator</h3>
              <p className="text-gray-600 mb-4">
                Calculate exact age in years, months, and days from any date.
              </p>
              <Link href="/calculators/age" className="inline-flex items-center text-primary font-medium hover:gap-2 transition-all">
                Calculate Now <ChevronRight size={18} />
              </Link>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg card-hover border border-gray-100">
              <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center mb-6">
                <AlertTriangle className="text-secondary" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Hit and Run Cases</h3>
              <p className="text-gray-600 mb-4">
                Special compensation calculations for hit and run accident cases.
              </p>
              <Link href="/calculators/hit-run" className="inline-flex items-center text-primary font-medium hover:gap-2 transition-all">
                Calculate Now <ChevronRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Other <span className="text-primary">Documents</span> & <span className="text-secondary">Features</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-start gap-4 p-6 bg-gray-50 rounded-xl hover:bg-primary/5 transition">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="text-primary" size={24} />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Vakalatnama</h4>
                <p className="text-sm text-gray-500 mt-1">Legal authorization document</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-6 bg-gray-50 rounded-xl hover:bg-primary/5 transition">
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <BookOpen className="text-secondary" size={24} />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Legal Dictionary</h4>
                <p className="text-sm text-gray-500 mt-1">Comprehensive legal terms</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-6 bg-gray-50 rounded-xl hover:bg-primary/5 transition">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="text-primary" size={24} />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Provisions in Accident Claims</h4>
                <p className="text-sm text-gray-500 mt-1">Legal provisions & sections</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-6 bg-gray-50 rounded-xl hover:bg-primary/5 transition">
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Users className="text-secondary" size={24} />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Motor Vehicle Act</h4>
                <p className="text-sm text-gray-500 mt-1">Complete MV Act reference</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-6 bg-gray-50 rounded-xl hover:bg-primary/5 transition">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Briefcase className="text-primary" size={24} />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Employee Compensation Act</h4>
                <p className="text-sm text-gray-500 mt-1">Workmen's Comp Act 1923</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-6 bg-gray-50 rounded-xl hover:bg-primary/5 transition">
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Download className="text-secondary" size={24} />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">RTO Documents</h4>
                <p className="text-sm text-gray-500 mt-1">Vehicle registration info</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              About <span className="text-primary">Us</span>
            </h2>
          </div>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <div className="aspect-video bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center">
                <div className="text-center text-white p-8">
                  <Shield className="w-24 h-24 mx-auto mb-4 opacity-80" />
                  <h3 className="text-2xl font-bold">Watch Our Story</h3>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <CheckCircle className="text-primary flex-shrink-0 mt-1" size={24} />
                <p className="text-gray-600">
                  Ruswaps India is a Proprietorship firm providing services and support related to technology.
                </p>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="text-secondary flex-shrink-0 mt-1" size={24} />
                <p className="text-gray-600">
                  We value our long-standing relationship with end-users around the country.
                </p>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="text-primary flex-shrink-0 mt-1" size={24} />
                <p className="text-gray-600">
                  Our ability is to respond to users' changing needs with innovative solutions.
                </p>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="text-secondary flex-shrink-0 mt-1" size={24} />
                <p className="text-gray-600">
                  Registered as MSME under the initiative of Govt. of India with Udyam Registration Number: <strong>UDYAM-AP-04-0002748</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Case Direction Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Case <span className="text-primary">Direction</span>
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Manage your legal cases efficiently with our comprehensive case direction feature.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-primary font-bold">1</span>
                  </div>
                  <p className="text-gray-600">Automate case tracking with hearing date notifications</p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-primary font-bold">2</span>
                  </div>
                  <p className="text-gray-600">Get court name, case number, and hearing details</p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-primary font-bold">3</span>
                  </div>
                  <p className="text-gray-600">Download cases list as PDF report</p>
                </li>
              </ul>
              <Link href="/case-direction" className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition">
                Start Managing Cases <ChevronRight className="ml-2" size={18} />
              </Link>
            </div>
            <div className="relative">
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                <div className="space-y-4">
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-2">
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">Pending</span>
                      <span className="text-sm text-gray-500">15 Jan 2024</span>
                    </div>
                    <h4 className="font-semibold text-gray-900">Case #12345/2023</h4>
                    <p className="text-sm text-gray-500">Motor Vehicle Accident - Death Claim</p>
                    <p className="text-sm text-gray-400 mt-2">City Civil Court, Tenali</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-2">
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">Next Hearing</span>
                      <span className="text-sm text-gray-500">20 Jan 2024</span>
                    </div>
                    <h4 className="font-semibold text-gray-900">Case #12346/2023</h4>
                    <p className="text-sm text-gray-500">Workmen Compensation - Injury</p>
                    <p className="text-sm text-gray-400 mt-2">Labour Court, Guntur</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Contact <span className="text-secondary">Us</span>
            </h2>
          </div>
          <div className="grid lg:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h3 className="text-2xl font-bold">Let's talk about your idea</h3>
              <form className="space-y-4">
                <div>
                  <input 
                    type="text" 
                    placeholder="Your Name" 
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    type="email" 
                    placeholder="Email*" 
                    className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary text-white"
                  />
                  <input 
                    type="tel" 
                    placeholder="Phone" 
                    className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary text-white"
                  />
                </div>
                <div>
                  <textarea 
                    placeholder="Tell Us About Project" 
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary text-white resize-none"
                  ></textarea>
                </div>
                <button 
                  type="submit"
                  className="w-full px-8 py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-semibold hover:opacity-90 transition"
                >
                  Send Message
                </button>
              </form>
            </div>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="text-secondary" size={24} />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Office Location</h4>
                  <p className="text-gray-400">
                    Ruswaps India,<br />
                    Tenali, Guntur Dist.,<br />
                    Andhra Pradesh-522201
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Phone className="text-secondary" size={24} />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Phone</h4>
                  <a href="tel:+919440117731" className="text-gray-400 hover:text-secondary transition">+91 9440117731</a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Mail className="text-secondary" size={24} />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Email</h4>
                  <a href="mailto:support@ruswaps.in" className="text-gray-400 hover:text-secondary transition">support@ruswaps.in</a>
                </div>
              </div>
              <div className="pt-4">
                <a href="#" className="inline-block">
                  <div className="bg-gray-800 rounded-lg p-4 flex items-center gap-3 hover:bg-gray-700 transition">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                      <span className="text-black font-bold">G</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">GET IT ON</p>
                      <p className="font-semibold">Google Play</p>
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="Ruswaps" width={40} height={40} className="w-10 h-10 object-contain" />
            </div>
            <div className="flex gap-6 text-gray-400">
              <Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white transition">Terms of Service</Link>
              <Link href="/disclaimer" className="hover:text-white transition">Disclaimer</Link>
            </div>
            <p className="text-gray-400 text-sm">
              © 2024 Ruswaps India. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Signup Modal */}
      {signupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Sign Up for Updates</h3>
              <button onClick={() => setSignupModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  maxLength={10}
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-semibold hover:opacity-90 transition"
              >
                Submit
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
