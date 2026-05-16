'use client'

import { easeInOut, motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/design-system/primitives/button'

type GlowyWavesHeroProps = {
  kicker?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  primaryCta?: { label: string; href: string }
  secondaryCta?: { label: string; href: string }
  stats?: Array<{ label: string; value: string }>
  highlights?: string[]
}

/**
 * GlowyWavesHero — Premium cinematic hero section with animated glowing waves.
 *
 * Features:
 * - Animated glowing waves background with purple + blue glow effects
 * - Glassmorphism surfaces and premium typography
 * - Responsive design with elegant spacing
 * - Stats grid with floating glass cards
 * - Political transparency platform context (Brazil)
 * - Production-ready animations and transitions
 */
export function GlowyWavesHero({
  kicker,
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  stats = [],
  highlights = [],
}: GlowyWavesHeroProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: easeInOut },
    },
  }

  const floatingVariants = {
    initial: { y: 0 },
    animate: {
      y: [-8, 8, -8],
      transition: {
        duration: 6,
        ease: easeInOut,
        repeat: Number.POSITIVE_INFINITY,
      },
    },
  }

  const glowVariants = {
    initial: { opacity: 0.3 },
    animate: {
      opacity: [0.3, 0.6, 0.3],
      transition: {
        duration: 4,
        ease: easeInOut,
        repeat: Number.POSITIVE_INFINITY,
      },
    },
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* Animated gradient backgrounds */}
      <div className="absolute inset-0">
        {/* Primary glow — blue radial gradient */}
        <motion.div
          animate="animate"
          className="absolute inset-0"
          initial="initial"
          variants={glowVariants}
        >
          <div className="absolute left-0 top-0 h-96 w-96 rounded-full bg-linear-to-br from-blue-600/20 via-transparent to-transparent blur-3xl" />
        </motion.div>

        {/* Secondary glow — purple radial gradient */}
        <motion.div
          animate="animate"
          className="absolute inset-0"
          initial="initial"
          variants={{
            ...glowVariants,
            animate: {
              opacity: [0.2, 0.5, 0.2],
              transition: {
                duration: 5,
                ease: easeInOut,
                repeat: Number.POSITIVE_INFINITY,
              },
            },
          }}
        >
          <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-linear-to-bl from-purple-600/20 via-transparent to-transparent blur-3xl" />
        </motion.div>

        {/* Tertiary glow — bottom accent */}
        <motion.div
          animate="animate"
          className="absolute inset-0"
          initial="initial"
          variants={{
            ...glowVariants,
            animate: {
              opacity: [0.15, 0.35, 0.15],
              transition: {
                duration: 6.5,
                ease: easeInOut,
                repeat: Number.POSITIVE_INFINITY,
              },
            },
          }}
        >
          <div className="absolute bottom-0 right-32 h-72 w-72 rounded-full bg-linear-to-tl from-cyan-500/15 via-transparent to-transparent blur-3xl" />
        </motion.div>

        {/* Subtle grid overlay */}
        <div className="absolute inset-0 grid-bg" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <motion.div
          className="w-full max-w-4xl"
          initial="hidden"
          variants={containerVariants}
          viewport={{ once: true }}
          whileInView="visible"
        >
          {/* Kicker */}
          {kicker && (
            <motion.div
              className="mb-6 flex justify-center"
              variants={itemVariants}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/40 px-4 py-2 backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="text-foreground-muted text-sm font-medium">
                  {kicker}
                </span>
              </div>
            </motion.div>
          )}

          {/* Title */}
          <motion.h1
            className="text-center font-bold text-5xl tracking-tight sm:text-6xl lg:text-7xl"
            variants={itemVariants}
          >
            <span className="block bg-linear-to-b from-white via-white to-foreground-muted bg-clip-text text-transparent">
              {title}
            </span>
          </motion.h1>

          {/* Subtitle */}
          {subtitle && (
            <motion.p
              className="mx-auto mt-8 max-w-2xl text-center text-foreground-muted text-lg sm:text-xl leading-relaxed"
              variants={itemVariants}
            >
              {subtitle}
            </motion.p>
          )}

          {/* CTAs */}
          {(primaryCta || secondaryCta) && (
            <motion.div
              className="mt-12 flex flex-col justify-center gap-4 sm:flex-row"
              variants={itemVariants}
            >
              {primaryCta && (
                <Button
                  asChild
                  className="group relative px-8 py-3 text-base font-semibold"
                  size="lg"
                >
                  <a href={primaryCta.href}>
                    {primaryCta.label}
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </a>
                </Button>
              )}
              {secondaryCta && (
                <Button
                  asChild
                  className="px-8 py-3 text-base font-semibold"
                  size="lg"
                  variant="outline"
                >
                  <a href={secondaryCta.href}>{secondaryCta.label}</a>
                </Button>
              )}
            </motion.div>
          )}

          {/* Stats Grid */}
          {stats.length > 0 && (
            <motion.div className="mt-16" variants={itemVariants}>
              <motion.div
                animate="animate"
                className="rounded-2xl border border-border/50 bg-linear-to-b from-surface/60 to-surface/30 p-8 backdrop-blur-xl sm:p-10"
                initial="initial"
                variants={floatingVariants}
              >
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 md:gap-8">
                  {stats.map((stat) => (
                    <motion.div
                      className="text-center"
                      key={`${stat.label}-${stat.value}`}
                      variants={itemVariants}
                    >
                      <div className="text-3xl font-bold sm:text-4xl text-white">
                        {stat.value}
                      </div>
                      <div className="mt-2 text-foreground-muted text-sm sm:text-base">
                        {stat.label}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Highlights Pills */}
          {highlights.length > 0 && (
            <motion.div
              className="mt-12 flex flex-wrap justify-center gap-3"
              variants={itemVariants}
            >
              {highlights.map((highlight) => (
                <div
                  className="inline-flex items-center rounded-full border border-border/50 bg-surface/30 px-4 py-2 text-foreground-muted text-sm backdrop-blur-sm transition-colors hover:bg-surface/50"
                  key={highlight}
                >
                  {highlight}
                </div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Animated floating accent line */}
      <motion.div
        animate={{
          opacity: [0.1, 0.3, 0.1],
        }}
        className="absolute bottom-0 left-1/2 h-px w-1/2 -translate-x-1/2 bg-linear-to-r from-transparent via-accent to-transparent"
        transition={{
          duration: 3,
          ease: easeInOut,
          repeat: Number.POSITIVE_INFINITY,
        }}
      />
    </div>
  )
}
