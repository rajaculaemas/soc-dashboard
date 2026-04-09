#!/usr/bin/env node

/**
 * Telegram Polling Client
 * Continuously fetches updates from Telegram and processes them
 * Run with: node telegram-polling-client.js
 * Or with PM2: pm2 start telegram-polling-client.js --name telegram-polling
 */

const POLLING_INTERVAL = parseInt(process.env.TELEGRAM_POLLING_INTERVAL || "2", 10) // seconds
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"
const CRON_SECRET = process.env.CRON_SECRET || "telegram_polling_cron_secret_2026"

console.log(`[Telegram Polling Client] Starting...`)
console.log(`[Telegram Polling Client] Polling interval: ${POLLING_INTERVAL} seconds`)
console.log(`[Telegram Polling Client] API URL: ${API_URL}`)

let pollingCount = 0
let errorCount = 0

async function poll() {
  const timestamp = new Date().toISOString()
  
  try {
    pollingCount++

    const response = await fetch(`${API_URL}/cron/telegram-polling`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${CRON_SECRET}`,
        "Content-Type": "application/json",
      },
    })

    const data = await response.json()

    if (response.ok) {
      if (data.updatesProcessed > 0) {
        console.log(
          `[${timestamp}] ✅ Processed ${data.updatesProcessed} Telegram update(s)`,
        )
      }
    } else {
      console.error(
        `[${timestamp}] ❌ Polling failed: ${data.error || response.statusText}`,
      )
      errorCount++
    }
  } catch (error) {
    console.error(
      `[${timestamp}] ❌ Polling error:`,
      error instanceof Error ? error.message : error,
    )
    errorCount++
  }

  // Print stats every 100 polls
  if (pollingCount % 100 === 0) {
    console.log(
      `[Stats] Total polls: ${pollingCount}, Errors: ${errorCount}, Error rate: ${((errorCount / pollingCount) * 100).toFixed(2)}%`,
    )
  }
}

// Start polling
console.log(`[Telegram Polling Client] Starting main loop...`)
setInterval(poll, POLLING_INTERVAL * 1000)

// Poll immediately on start
poll()

// Graceful shutdown
process.on("SIGINT", () => {
  console.log(
    `\n[Telegram Polling Client] Shutting down... (${pollingCount} polls completed)`,
  )
  process.exit(0)
})

process.on("SIGTERM", () => {
  console.log(
    `\n[Telegram Polling Client] Terminated... (${pollingCount} polls completed)`,
  )
  process.exit(0)
})
