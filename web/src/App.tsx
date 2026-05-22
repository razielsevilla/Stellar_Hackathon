import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Download, 
  Lock, 
  Camera, 
  Zap, 
  Shield, 
  Code, 
  ExternalLink,
  Users,
  Database,
  Coins,
  Wallet,
  Server,
  Terminal,
  Copy,
  Check,
  Award
} from 'lucide-react';

// TokaBit mascot with interactive emotional states
const TokaMascot = () => {
  const [mood, setMood] = useState<'excited' | 'cool' | 'party' | 'happy'>('excited');

  const getEmoji = () => {
    switch (mood) {
      case 'cool': return '😎';
      case 'party': return '🥳';
      case 'happy': return '👾';
      default: return '🤩';
    }
  };

  const getTooltip = () => {
    switch (mood) {
      case 'cool': return 'TOKA rules the testnet!';
      case 'party': return 'Task approved! Time to celebrate!';
      case 'happy': return 'Blockchain-backed financial literacy!';
      default: return 'Tap me to change my vibe!';
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          const moods: ('excited' | 'cool' | 'party' | 'happy')[] = ['excited', 'cool', 'party', 'happy'];
          const nextIndex = (moods.indexOf(mood) + 1) % moods.length;
          setMood(moods[nextIndex]);
        }}
        className="text-8xl cursor-pointer select-none drop-shadow-[0_0_15px_rgba(0,240,255,0.6)]"
      >
        {getEmoji()}
      </motion.div>
      <div className="bg-brand-dark/80 backdrop-blur-sm border border-brand-cyan/20 px-3 py-1 rounded-full text-xs font-semibold text-brand-cyan tracking-wide animate-pulse">
        {getTooltip()}
      </div>
    </div>
  );
};

const FeatureCard = ({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) => (
  <motion.div 
    whileHover={{ scale: 1.03, y: -5 }}
    className="glass-card p-6 rounded-2xl flex flex-col items-start gap-4 hover:border-brand-cyan/40 transition-all duration-300 relative group overflow-hidden"
  >
    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-brand-cyan/50 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
    <div className="p-3 bg-brand-dark rounded-xl border border-white/5 shadow-inner">
      <Icon className="text-brand-cyan w-6 h-6" />
    </div>
    <h3 className="text-xl font-bold text-white">{title}</h3>
    <p className="text-brand-muted leading-relaxed text-sm">{desc}</p>
  </motion.div>
);

const StepCard = ({ num, title, desc }: { num: string, title: string, desc: string }) => (
  <div className="relative flex flex-col items-center text-center max-w-xs z-10 p-6 glass-card rounded-2xl hover:border-brand-orange/40 transition-all duration-300">
    <div className="w-14 h-14 rounded-full bg-brand-orange/20 border border-brand-orange flex items-center justify-center text-xl font-extrabold text-brand-orange mb-4 shadow-[0_0_20px_rgba(255,107,53,0.3)]">
      {num}
    </div>
    <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
    <p className="text-sm text-brand-muted leading-relaxed">{desc}</p>
  </div>
);

function App() {
  const [activeTab, setActiveTab] = useState<'parents' | 'kids'>('parents');
  const [copiedContract, setCopiedContract] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<'clone' | 'backend' | 'mobile'>('clone');

  const contractAddress = 'CBNKIN4EGJDUGPZXZ4JYGMNYVAGDM2HRKFEX57RG3OLCZSMZKGPVAWFN';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(contractAddress);
    setCopiedContract(true);
    setTimeout(() => setCopiedContract(false), 2000);
  };

  return (
    <div className="min-h-screen bg-brand-dark selection:bg-brand-cyan/30 text-slate-50 overflow-x-hidden font-sans">
      
      {/* Dynamic Ambient Background Lights */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-brand-cyan/5 via-brand-orange/5 to-transparent pointer-events-none z-0" />

      {/* Navigation */}
      <nav className="w-full fixed top-0 z-50 bg-brand-dark/80 backdrop-blur-md border-b border-white/10 px-6 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-cyan to-brand-orange flex items-center justify-center text-lg font-black text-brand-dark shadow-[0_0_15px_rgba(0,240,255,0.4)]">
            T
          </div>
          <span className="text-2xl font-black tracking-tight text-white">Toka</span>
        </div>
        <div className="hidden lg:flex gap-8 text-brand-muted font-medium text-sm">
          <a href="#problem-vision" className="hover:text-brand-cyan transition-colors">Problem & Vision</a>
          <a href="#how-it-works" className="hover:text-brand-cyan transition-colors">How it Works</a>
          <a href="#audience" className="hover:text-brand-cyan transition-colors">Audience Split</a>
          <a href="#features" className="hover:text-brand-cyan transition-colors">Features</a>
          <a href="#architecture" className="hover:text-brand-cyan transition-colors">Architecture</a>
          <a href="#deployment" className="hover:text-brand-cyan transition-colors">Deployment</a>
          <a href="#dev-corner" className="hover:text-brand-cyan transition-colors">Quick Start</a>
        </div>
        <div className="flex items-center gap-3">
          <a 
            href="https://github.com/Raziel/Stellar" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors border border-white/10"
          >
            <Code className="w-4 h-4" /> GitHub
          </a>
          <a 
            href="#dev-corner"
            className="bg-gradient-to-r from-brand-cyan to-blue-500 text-brand-dark font-bold text-sm px-5 py-2.5 rounded-lg hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all"
          >
            Try the Sandbox
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 px-6 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 z-10">
        <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-brand-cyan/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-brand-orange/15 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="flex-1 flex flex-col items-start text-left">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan text-xs font-semibold mb-6 shadow-inner"
          >
            <Zap className="w-3.5 h-3.5" /> Hackathon 2026 Submission
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight mb-6 text-white"
          >
            Gamifying Responsibility.<br />
            Tokenizing <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-cyan via-blue-400 to-brand-orange">Financial Literacy</span>.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-brand-muted max-w-xl mb-10 leading-relaxed"
          >
            A decentralized family micro-economy built on the **Stellar Network**. OFWs and parents fund chore rewards, teach savings habits, and foster digital asset ownership for youth using **Soroban smart contracts**.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          >
            <a 
              href="https://github.com/Raziel/Stellar"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-brand-cyan text-brand-dark px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-opacity-90 transition-all shadow-[0_0_25px_rgba(0,240,255,0.4)]"
            >
              <Download className="w-5 h-5" /> Explore Codebase
            </a>
            <a 
              href="#dev-corner"
              className="glass-card px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-white/5 transition-all"
            >
              <Play className="w-5 h-5" /> Developer Quick Start
            </a>
          </motion.div>
        </div>

        {/* Dynamic Mobile Simulator */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex-1 relative w-full flex justify-center mt-12 lg:mt-0"
        >
          {/* Outer Ring */}
          <div className="relative p-4 rounded-[3.5rem] bg-gradient-to-br from-brand-cyan/20 to-brand-orange/20 border border-white/10 shadow-[0_0_50px_rgba(0,240,255,0.15)]">
            {/* Phone Body */}
            <div className="w-[310px] h-[610px] bg-[#0B0F19] rounded-[2.8rem] border-8 border-[#1A2235] shadow-2xl relative overflow-hidden flex flex-col items-center pt-10 px-5">
              <div className="absolute top-0 w-32 h-5 bg-[#1A2235] rounded-b-2xl z-20" /> {/* Notch */}
              
              <div className="w-full flex justify-between items-center mb-6 text-xs text-brand-muted">
                <span>9:41 📡</span>
                <span className="text-brand-cyan font-semibold">Stellar Testnet</span>
              </div>

              <div className="w-full flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] text-brand-muted uppercase tracking-wider font-bold">Earner Account</p>
                  <h4 className="text-md font-bold text-white">TokaBit Sandbox</h4>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-[10px] font-bold text-brand-cyan">
                  Level 4 🛡️
                </div>
              </div>

              {/* Wallet Card */}
              <div className="w-full glass-card rounded-2xl p-5 flex flex-col items-center mb-5 border-brand-cyan/20 shadow-[0_0_15px_rgba(0,240,255,0.05)]">
                <p className="text-brand-muted text-xs mb-1">Decentralized Balance</p>
                <h3 className="text-3xl font-extrabold text-brand-orange tracking-tight mb-4">125.00 TOKA</h3>
                <TokaMascot />
              </div>

              {/* In-app list */}
              <div className="w-full flex flex-col gap-2 flex-grow overflow-hidden">
                <p className="text-[10px] text-brand-muted uppercase tracking-wider font-bold mb-1">Chores Queue</p>
                
                <div className="bg-white/5 rounded-xl p-3.5 border border-white/5 flex flex-col">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-sm text-white">Wash the dishes</span>
                    <span className="text-[10px] font-extrabold text-brand-orange">15 TOKA</span>
                  </div>
                  <span className="text-[10px] text-brand-muted mb-2">Submitted Proof 📸</span>
                  <div className="w-full bg-brand-cyan/20 text-brand-cyan text-[10px] font-bold py-1.5 rounded text-center uppercase tracking-wider">
                    Pending Approval
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-3.5 border border-white/5 flex justify-between items-center opacity-60">
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-white">Feed the cat</span>
                    <span className="text-[10px] text-brand-muted">Daily chore</span>
                  </div>
                  <span className="text-xs font-bold text-brand-cyan">5 TOKA</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Problem & Vision Section */}
      <section id="problem-vision" className="py-24 border-t border-white/5 bg-brand-dark/60 relative">
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-brand-orange/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4 text-white">The Core Challenge & Vision</h2>
            <p className="text-brand-muted text-lg max-w-2xl mx-auto">Solving systemic financial hurdles inside the household utilizing Stellar's blockchain parameters.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="glass-card p-8 rounded-2xl border border-red-500/10 hover:border-red-500/20 transition-all duration-300">
              <span className="text-3xl mb-4 block">🇵🇭</span>
              <h3 className="text-xl font-bold text-white mb-3">Financial Illiteracy</h3>
              <p className="text-brand-muted text-sm leading-relaxed">
                Philippine youth are overwhelmingly unbanked and lack hands-on, practical exposure to compound interest, taxation, and micro-savings at an early age.
              </p>
            </div>
            <div className="glass-card p-8 rounded-2xl border border-yellow-500/10 hover:border-yellow-500/20 transition-all duration-300">
              <span className="text-3xl mb-4 block">✈️</span>
              <h3 className="text-xl font-bold text-white mb-3">Remittance Opacity</h3>
              <p className="text-brand-muted text-sm leading-relaxed">
                Overseas Filipino Workers (OFWs) send remittances home to support families, but lack reliable verification mechanisms to ensure funds support child education.
              </p>
            </div>
            <div className="glass-card p-8 rounded-2xl border border-blue-500/10 hover:border-blue-500/20 transition-all duration-300">
              <span className="text-3xl mb-4 block">⛽</span>
              <h3 className="text-xl font-bold text-white mb-3">Micro-reward Friction</h3>
              <p className="text-brand-muted text-sm leading-relaxed">
                Small incentives for tasks (e.g., ₱10–₱50) are impossible to execute using traditional blockchains due to severe fee costs. Soroban provides the required low-cost solution.
              </p>
            </div>
          </div>

          {/* Long Term Vision Card */}
          <div className="glass-card p-8 md:p-12 rounded-3xl border border-brand-cyan/20 relative overflow-hidden bg-gradient-to-r from-brand-deep/80 to-brand-dark/80">
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-brand-cyan/5 blur-[80px] rounded-full pointer-events-none" />
            <div className="relative z-10 max-w-3xl">
              <h4 className="text-brand-cyan uppercase tracking-wider text-xs font-bold mb-3">Long-term Vision</h4>
              <h3 className="text-2xl md:text-3xl font-extrabold text-white mb-4">Bridging the Financial Inclusion Gap</h3>
              <p className="text-brand-muted leading-relaxed text-md md:text-lg mb-6">
                "Toka introduces children to non-custodial digital asset systems and smart-contract-based micro-economies. By linking domestic household chores directly to international remittances, Toka creates a transparent and accountability-focused educational playground that teaches savings, interest yields, and decentralization fundamentals to the next generation."
              </p>
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <span>Empowering Builders of Tomorrow</span>
                <Award className="w-5 h-5 text-brand-orange" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-brand-dark/30 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4 text-white">The Chore Lifecycle</h2>
            <p className="text-brand-muted text-lg max-w-2xl mx-auto">From real-world chores to immutable on-chain smart contract completions.</p>
          </div>
          
          <div className="flex flex-col lg:flex-row justify-between items-center gap-8 relative">
            <StepCard 
              num="1" 
              title="Parent Assigns" 
              desc="Parents (Anchors) create tasks in-app or directly on-chain, defining deadlines, instructions, and TOKA rewards."
            />
            <div className="hidden lg:block h-0.5 bg-brand-cyan/20 flex-grow mx-4 max-w-[100px]" />
            <StepCard 
              num="2" 
              title="Child Submits Proof" 
              desc="Earners complete tasks and snap photo evidence, uploaded directly to IPFS, writing completion states on-chain."
            />
            <div className="hidden lg:block h-0.5 bg-brand-cyan/20 flex-grow mx-4 max-w-[100px]" />
            <StepCard 
              num="3" 
              title="Consensus & Payout" 
              desc="Co-parents approve. The Soroban smart contract validates conditions and distributes TOKA from vault directly to the child's non-custodial wallet."
            />
          </div>
        </div>
      </section>

      {/* Audience Experience Segment (Interactive Switch) */}
      <section id="audience" className="py-24 border-t border-white/5 bg-brand-dark/50 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4 text-white">Dual Interface Focus</h2>
            <p className="text-brand-muted text-lg max-w-xl mx-auto">Toka separates roles cleanly to deliver customized parent (Anchor) and child (Earner) dashboards.</p>
            
            {/* Tabs Trigger */}
            <div className="inline-flex p-1.5 rounded-xl bg-brand-deep border border-white/10 mt-8">
              <button 
                onClick={() => setActiveTab('parents')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'parents' ? 'bg-brand-cyan text-brand-dark shadow-[0_0_15px_rgba(0,240,255,0.3)]' : 'text-brand-muted hover:text-white'}`}
              >
                Parents & OFWs (Anchors)
              </button>
              <button 
                onClick={() => setActiveTab('kids')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'kids' ? 'bg-brand-orange text-brand-dark shadow-[0_0_15px_rgba(255,107,53,0.3)]' : 'text-brand-muted hover:text-white'}`}
              >
                Kids & Youth (Earners)
              </button>
            </div>
          </div>

          {/* Interactive Tab Contents */}
          <div className="min-h-[380px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              {activeTab === 'parents' ? (
                <motion.div 
                  key="parents-tab"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="grid lg:grid-cols-2 gap-12 items-center w-full"
                >
                  <div className="flex flex-col items-start gap-6">
                    <span className="px-3.5 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/25 text-brand-cyan font-bold text-xs uppercase tracking-wider">
                      Supervisory Control
                    </span>
                    <h3 className="text-3xl font-extrabold text-white leading-tight">Remote Remittance and Accountability Hub</h3>
                    <p className="text-brand-muted leading-relaxed">
                      Parents configure stable vault wallets on-chain to handle allowance funding. If you are an OFW, you can easily verify that the rewards you provide correspond directly to completed educational and household chores.
                    </p>
                    <ul className="flex flex-col gap-3.5 text-sm text-slate-200 w-full">
                      <li className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-brand-cyan/20 border border-brand-cyan flex items-center justify-center text-[10px] text-brand-cyan font-bold">✓</span>
                        Remote task management with smart contract verification.
                      </li>
                      <li className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-brand-cyan/20 border border-brand-cyan flex items-center justify-center text-[10px] text-brand-cyan font-bold">✓</span>
                        Co-parent approval rules to ensure joint family consensus.
                      </li>
                      <li className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-brand-cyan/20 border border-brand-cyan flex items-center justify-center text-[10px] text-brand-cyan font-bold">✓</span>
                        Weekly taxation rules and deposit interest setup.
                      </li>
                    </ul>
                  </div>
                  <div className="glass-card p-8 rounded-3xl border-brand-cyan/20 bg-gradient-to-tr from-brand-deep to-brand-dark shadow-xl">
                    <h4 className="font-extrabold text-lg text-white mb-6 border-b border-white/10 pb-3 flex items-center gap-2">
                      <Wallet className="text-brand-cyan w-5 h-5" /> Parent Controls Panel
                    </h4>
                    <div className="flex flex-col gap-4">
                      <div>
                        <span className="text-xs text-brand-muted block mb-1">Weekly Household Tax Rate</span>
                        <div className="bg-brand-dark p-3.5 rounded-xl border border-white/5 flex justify-between items-center">
                          <span className="font-bold text-white">5 TOKA / week</span>
                          <span className="text-xs text-brand-cyan font-semibold">Auto-Deducted</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-brand-muted block mb-1">Savings Account Yield Interest</span>
                        <div className="bg-brand-dark p-3.5 rounded-xl border border-white/5 flex justify-between items-center">
                          <span className="font-bold text-white">3% APY (weekly distributed)</span>
                          <span className="text-xs text-brand-cyan font-semibold">Active</span>
                        </div>
                      </div>
                      <div className="bg-brand-cyan/10 border border-brand-cyan/20 p-4 rounded-xl text-xs text-brand-cyan leading-relaxed">
                        <strong>Micro-Finance Simulation:</strong> Introducing weekly room taxes and interest payouts trains children to understand real financial overheads and banking incentives.
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="kids-tab"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="grid lg:grid-cols-2 gap-12 items-center w-full"
                >
                  <div className="glass-card p-8 rounded-3xl border-brand-orange/20 bg-gradient-to-tr from-brand-deep to-brand-dark shadow-xl order-2 lg:order-1">
                    <h4 className="font-extrabold text-lg text-white mb-6 border-b border-white/10 pb-3 flex items-center gap-2">
                      <Coins className="text-brand-orange w-5 h-5" /> Sibling Auction House
                    </h4>
                    <div className="flex flex-col gap-4">
                      <div className="bg-brand-dark p-4 rounded-xl border border-white/5 flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-white">🎮 Weekend Switch Privilege</span>
                          <span className="text-[10px] text-brand-muted">Bidding closes in 4h</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-extrabold text-brand-orange">45 TOKA</span>
                          <span className="text-[9px] text-brand-muted">Current Bid: Kid 2</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="number" 
                          placeholder="Bid amount..." 
                          className="bg-brand-dark text-white px-3 py-2 rounded-lg border border-white/10 text-sm focus:outline-none focus:border-brand-orange flex-grow"
                          defaultValue={50}
                        />
                        <button className="bg-brand-orange text-brand-dark font-bold text-xs px-4 py-2 rounded-lg shadow-md hover:bg-opacity-90">
                          Place Bid
                        </button>
                      </div>
                      <div className="bg-brand-orange/10 border border-brand-orange/20 p-4 rounded-xl text-xs text-brand-orange leading-relaxed">
                        <strong>Game Theoretical Rewards:</strong> Earners compete for household perks inside controlled bids, recirculating digital assets back into the family vault on-chain.
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-6 order-1 lg:order-2">
                    <span className="px-3.5 py-1 rounded-full bg-brand-orange/10 border border-brand-orange/25 text-brand-orange font-bold text-xs uppercase tracking-wider">
                      Gamified Earning
                    </span>
                    <h3 className="text-3xl font-extrabold text-white leading-tight">True Ownership & Asset Redemptions</h3>
                    <p className="text-brand-muted leading-relaxed">
                      Children operate non-custodial local wallets, allowing them to manage chore revenues. Earners decide when to bid on sibling auctions, buy custom shop rewards setup by parents, or locks funds to access savings multipliers.
                    </p>
                    <ul className="flex flex-col gap-3.5 text-sm text-slate-200 w-full">
                      <li className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-brand-orange/20 border border-brand-orange flex items-center justify-center text-[10px] text-brand-orange font-bold">✓</span>
                        Instant micro-transfers directly on Stellar testnet.
                      </li>
                      <li className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-brand-orange/20 border border-brand-orange flex items-center justify-center text-[10px] text-brand-orange font-bold">✓</span>
                        Interactive bidding for family rewards and screen times.
                      </li>
                      <li className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-brand-orange/20 border border-brand-orange flex items-center justify-center text-[10px] text-brand-orange font-bold">✓</span>
                        Savings multipliers that reward holding onto tokens.
                      </li>
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Smart Features Grid */}
      <section id="features" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4 text-white">Engineered Smart Features</h2>
            <p className="text-brand-muted text-lg max-w-2xl mx-auto">Combining low-friction UX with secure Soroban smart contract structures.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={Shield} 
              title="Soroban Chore Lifecycle" 
              desc="Decentralized task flows recording submit and approve transactions on-chain. Rewards are automated without parent custody risks."
            />
            <FeatureCard 
              icon={Lock} 
              title="Non-Custodial In-App Wallets" 
              desc="Secure private key generation stored safely on the device via Expo SecureStore, automatically initializing trustlines for custom TOKA assets."
            />
            <FeatureCard 
              icon={Coins} 
              title="Sibling Privileges Auctions" 
              desc="Fun, interactive auction listings for family privileges where earners outbid each other, recirculating currency on-chain."
            />
            <FeatureCard 
              icon={Camera} 
              title="IPFS Proof Submissions" 
              desc="Task submissions upload image proof to IPFS via Pinata. The resulting CID is permanently linked on-chain inside the task struct."
            />
            <FeatureCard 
              icon={Award} 
              title="Delayed Gratification Multiplier" 
              desc="Encouraging micro-savings: Cashing out tokens over longer saving periods yields kids a higher fiat exchange rate funded by the parent."
            />
            <FeatureCard 
              icon={Users} 
              title="Interactive Mascot UX" 
              desc="TokaBit, our dynamic sandbox mascot, reflects active states, celebrate milestones, and teaches kids financial vibes."
            />
          </div>
        </div>
      </section>

      {/* Technical Stack & Architecture */}
      <section id="architecture" className="py-24 border-t border-white/5 bg-[#0B0F18] relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4 text-white">Full-Stack Technical Architecture</h2>
            <p className="text-brand-muted text-lg max-w-2xl mx-auto">Clean decoupling between Soroban smart contracts, Node.js API layer, and Expo mobile app.</p>
          </div>

          {/* Architecture flow mapping */}
          <div className="grid lg:grid-cols-3 gap-8 items-stretch mb-16">
            
            {/* Frontend App Column */}
            <div className="glass-card p-8 rounded-2xl border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500 flex items-center justify-center">
                    <Wallet className="text-blue-400 w-4 h-4" />
                  </div>
                  <h4 className="font-extrabold text-white text-md">1. Expo Mobile UI</h4>
                </div>
                <p className="text-brand-muted text-xs leading-relaxed mb-6">
                  React Native container built using Expo Router. Handles user interfaces, local non-custodial key storage, IPFS camera snaps, and push messaging payloads.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5">
                {['React Native', 'Expo SecureStore', 'Lucide Icons'].map(tag => (
                  <span key={tag} className="text-[10px] font-semibold px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/10">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Backend API Service */}
            <div className="glass-card p-8 rounded-2xl border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500 flex items-center justify-center">
                    <Server className="text-purple-400 w-4 h-4" />
                  </div>
                  <h4 className="font-extrabold text-white text-md">2. Express & SQLite DB</h4>
                </div>
                <p className="text-brand-muted text-xs leading-relaxed mb-6">
                  Node.js backend serving rest endpoints. Maintains local family records, recurring cron chores, push scheduling, and coordinates transaction submissions to Horizon.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5">
                {['Node.js', 'Express', 'SQLite', 'Better-SQLite3', 'Cron'].map(tag => (
                  <span key={tag} className="text-[10px] font-semibold px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/10">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Blockchain Network */}
            <div className="glass-card p-8 rounded-2xl border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-brand-cyan/20 border border-brand-cyan flex items-center justify-center">
                    <Database className="text-brand-cyan w-4 h-4" />
                  </div>
                  <h4 className="font-extrabold text-white text-md">3. Soroban Contracts</h4>
                </div>
                <p className="text-brand-muted text-xs leading-relaxed mb-6">
                  Rust-based smart contracts deployed on Stellar Testnet. Governs vaults, task records, sibling bids, and automated token payouts using Stellar Asset Contract interactions.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5">
                {['Rust', 'Soroban WASM', 'Stellar SDK', 'Horizon API'].map(tag => (
                  <span key={tag} className="text-[10px] font-semibold px-2.5 py-1 rounded-md bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/10">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Deployment & Testnet Parameters Section */}
      <section id="deployment" className="py-24 border-t border-white/5 bg-gradient-to-b from-brand-dark to-brand-deep relative">
        <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-brand-cyan/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6">
          <div className="glass-card p-8 md:p-12 rounded-3xl border border-brand-cyan/30 text-center relative overflow-hidden bg-[#0A0E18]">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-brand-cyan via-blue-500 to-brand-orange" />
            <h2 className="text-3xl font-extrabold text-white mb-6">On-Chain Deployment Parameters</h2>
            <p className="text-brand-muted text-md mb-8 leading-relaxed max-w-2xl mx-auto">
              Toka is currently operational in the sandbox environment. Check contract operations directly on-chain using public block explorers.
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <span className="px-4.5 py-1.5 rounded-full bg-brand-cyan/10 border border-brand-cyan/30 text-xs font-bold text-brand-cyan uppercase tracking-wider">
                Stellar Mainnet: Active 🟢
              </span>
              <span className="px-4.5 py-1.5 rounded-full bg-brand-cyan/10 border border-brand-cyan/30 text-xs font-bold text-brand-cyan uppercase tracking-wider">
                Stellar Testnet: Active 🟢
              </span>
            </div>

            {/* Address copy widget */}
            <div className="bg-brand-dark/95 border border-white/10 rounded-2xl p-4.5 max-w-xl mx-auto mb-8 flex items-center justify-between gap-4">
              <div className="flex flex-col items-start min-w-0">
                <span className="text-[10px] text-brand-muted uppercase font-bold tracking-wider mb-1">Soroban Task Contract ID</span>
                <span className="text-xs font-mono text-white truncate w-full tracking-wide">
                  {contractAddress}
                </span>
              </div>
              <button 
                onClick={copyToClipboard}
                className="bg-brand-cyan text-brand-dark p-2.5 rounded-xl hover:bg-opacity-90 transition-all flex items-center justify-center shrink-0"
                title="Copy Address"
              >
                {copiedContract ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a 
                href={`https://stellar.expert/explorer/mainnet/contract/${contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-6 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
              >
                <ExternalLink className="w-4 h-4" /> Verify on Stellar Expert
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Developer Corner (Bash Terminal Console Tab) */}
      <section id="dev-corner" className="py-24 border-t border-white/5 bg-[#0B0F19]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-white mb-4">Developer Sandbox Setup</h2>
            <p className="text-brand-muted text-sm max-w-xl mx-auto">Get Toka running locally on your device for development or evaluation.</p>
            
            {/* Terminal tabs */}
            <div className="flex justify-center gap-2 mt-8">
              {['clone', 'backend', 'mobile'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveCodeTab(tab as any)}
                  className={`px-4 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider border transition-all ${activeCodeTab === tab ? 'bg-white/10 border-brand-cyan text-brand-cyan' : 'bg-transparent border-white/10 text-brand-muted hover:text-white'}`}
                >
                  {tab === 'clone' ? '1. Clone Core' : tab === 'backend' ? '2. Backend API' : '3. Mobile App'}
                </button>
              ))}
            </div>
          </div>

          {/* Code block window */}
          <div className="bg-brand-dark border border-white/10 rounded-2xl shadow-2xl overflow-hidden font-mono text-left">
            <div className="bg-[#151D30] px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="text-xs text-brand-muted ml-3 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-brand-cyan" /> {activeCodeTab === 'clone' ? 'setup-repo.sh' : activeCodeTab === 'backend' ? 'setup-backend.sh' : 'setup-mobile.sh'}
              </span>
            </div>
            <div className="p-6 text-xs sm:text-sm text-slate-300 leading-relaxed overflow-x-auto whitespace-pre">
              {activeCodeTab === 'clone' && (
                <code>
{`# Clone the Toka hackathon repository
git clone https://github.com/Raziel/Stellar.git
cd Stellar

# Check folder layouts
ls
# Output directories: /backend, /contracts, /mobile, /web`}
                </code>
              )}
              {activeCodeTab === 'backend' && (
                <code>
{`# Enter backend directory and install express stack
cd backend
npm install

# Setup environment details
cp .env.example .env
# Edit .env with STELLAR_NETWORK, CONTRACT_ID, and IPFS PINATA keys

# Run the local backend API server
npm run dev
# Output: Toka API running on port 3333`}
                </code>
              )}
              {activeCodeTab === 'mobile' && (
                <code>
{`# Enter mobile React Native directory
cd mobile
npm install

# Launch local Expo bundler sandbox
npx expo start --clear

# Press 'a' for Android, 'i' for iOS simulator, or scan the QR code via Expo Go.`}
                </code>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-16 bg-[#090D17] relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-start gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-cyan to-brand-orange flex items-center justify-center text-md font-extrabold text-brand-dark">
                T
              </div>
              <span className="text-xl font-bold tracking-tight text-white">Toka</span>
            </div>
            <p className="text-brand-muted text-xs">Gamifying Household Responsibility, Tokenizing Financial Literacy</p>
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-2 text-center md:text-right">
            <p className="text-brand-muted text-xs">Developed by **Raziel** — Lead Developer & Founder</p>
            <p className="text-[10px] text-[#64748B]">Toka App © 2026. Released under the MIT License.</p>
          </div>
          
          <div className="flex gap-6 text-sm text-brand-muted">
            <a 
              href="https://github.com/Raziel/Stellar" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-brand-cyan transition-colors"
            >
              GitHub
            </a>
            <a 
              href="https://stellar.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-brand-cyan transition-colors"
            >
              Stellar.org
            </a>
            <a 
              href="https://soroban.stellar.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-brand-cyan transition-colors"
            >
              Soroban Docs
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;
