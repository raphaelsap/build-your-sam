import { motion } from 'framer-motion';

function BackgroundMesh() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute inset-[-20%] bg-[radial-gradient(circle_at_top,_rgba(106,13,173,0.12),_transparent_60%)]"
        animate={{ rotate: [0, 360] }}
        transition={{ repeat: Infinity, duration: 50, ease: 'linear' }}
      />
      <motion.div
        className="absolute inset-[-10%] bg-[radial-gradient(circle_at_bottom,_rgba(0,152,219,0.1),_transparent_65%)]"
        animate={{ rotate: [360, 0] }}
        transition={{ repeat: Infinity, duration: 60, ease: 'linear' }}
      />
      <motion.div
        className="absolute inset-0 opacity-40"
        animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
        transition={{ repeat: Infinity, duration: 30, ease: 'linear' }}
        style={{
          backgroundImage:
            'linear-gradient(120deg, rgba(106, 13, 173, 0.12) 0%, rgba(255,255,255,0) 40%), linear-gradient(300deg, rgba(0, 152, 219, 0.12) 0%, rgba(255,255,255,0) 40%)',
          backgroundSize: '200% 200%',
        }}
      />
    </div>
  );
}

export default BackgroundMesh;
