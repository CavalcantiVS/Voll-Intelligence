import React from 'react';
import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';
import styles from '../pages/Chat.module.css';

const TypingIndicator = () => {
  const dotVariants = {
    start: { y: 0 },
    end: { y: -4 }
  };

  const containerVariants = {
    start: { transition: { staggerChildren: 0.15 } },
    end: { transition: { staggerChildren: 0.15 } }
  };

  return (
    <div className={`${styles.message} ${styles.messageAi}`}>
      <div className={styles.messageAvatar}>
        <Bot size={18} />
      </div>
      <div className={styles.messageBody}>
        <div className={styles.messageHeader}>
          <span className={styles.messageSender}>Voll AI</span>
        </div>
        <div className={styles.messageContent} style={{ display: 'flex', alignItems: 'center', height: '40px' }}>
          <motion.div 
            variants={containerVariants}
            initial="start"
            animate="end"
            style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '0 8px' }}
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                variants={dotVariants}
                transition={{
                  duration: 0.4,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  ease: 'easeInOut'
                }}
                style={{
                  width: '6px',
                  height: '6px',
                  backgroundColor: 'var(--text-muted)',
                  borderRadius: '50%'
                }}
              />
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
