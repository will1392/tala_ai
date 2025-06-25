import { motion } from 'framer-motion';
import { GlassCard } from '../components/layout/GlassCard';
import { cn } from '../utils/cn';
import { 
  TrendingUp, 
  FileText, 
  Users, 
  MessageSquare,
  Activity,
  Calendar
} from 'lucide-react';

const stats = [
  { label: 'Active Tasks', value: '24', icon: Activity, trend: '+12%' },
  { label: 'Documents', value: '156', icon: FileText, trend: '+5%' },
  { label: 'Chat Sessions', value: '89', icon: MessageSquare, trend: '+23%' },
  { label: 'Active Clients', value: '45', icon: Users, trend: '+8%' },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export const Dashboard = () => {
  console.log('Dashboard component rendering...');
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-white/70">Welcome back! Here's your travel agency overview.</p>
      </div>

      {/* Stats Grid */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {stats.map((stat) => (
          <motion.div key={stat.label} variants={item}>
            <GlassCard glow className="hover:scale-105 transition-transform cursor-pointer">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white/60 text-sm">{stat.label}</p>
                  <p className="text-3xl font-bold mt-2">{stat.value}</p>
                  <p className="text-primary text-sm mt-1 flex items-center gap-1">
                    <TrendingUp size={16} />
                    {stat.trend}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                  <stat.icon className="text-primary" size={24} />
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      {/* Recent Activity & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <GlassCard>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Activity className="text-primary" size={20} />
              Recent Activity
            </h2>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="glass rounded-lg p-3 hover:bg-white/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">New booking request</p>
                      <p className="text-sm text-white/60">Client: John Doe - Tokyo Trip</p>
                    </div>
                    <span className="text-xs text-white/50">2 min ago</span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <GlassCard>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Calendar className="text-primary" size={20} />
              Upcoming Tasks
            </h2>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="glass rounded-lg p-3 hover:bg-white/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Follow up with client</p>
                      <p className="text-sm text-white/60">Due in 2 hours</p>
                    </div>
                    <span className={cn(
                      'px-2 py-1 rounded-full text-xs',
                      i === 1 ? 'bg-red-500/20 text-red-400' : 'bg-primary/20 text-primary'
                    )}>
                      {i === 1 ? 'Urgent' : 'Normal'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
};