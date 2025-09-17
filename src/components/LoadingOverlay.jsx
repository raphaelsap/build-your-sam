import { AnimatePresence, motion } from 'framer-motion';

function LoadingOverlay({ isVisible, message = 'Weaving the Solace mesh...' }) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <motion.div
            className="flex flex-col items-center gap-6 rounded-3xl border border-purple-100 bg-white px-10 py-8 shadow-xl"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <div className="relative h-16 w-16">
              <motion.span
                className="absolute inset-0 rounded-full border-4 border-t-solacePurple border-r-solaceBlue border-b-transparent border-l-transparent"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
              />
              <motion.span
                className="absolute inset-3 rounded-full border border-dashed border-solaceBlue"
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 2.8, ease: 'linear' }}
              />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-solacePurple">Searching company mesh</p>
              <p className="text-sm text-gray-600 mt-2 max-w-xs">{message}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default LoadingOverlay;
