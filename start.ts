const isWin = process.platform === "win32"

const api = Bun.spawn(["bun", "run", "api/index.ts"], {
  stdio: ["pipe", "inherit", "inherit"],
  env: { ...process.env },
})

await Bun.sleep(2000)

const client = Bun.spawn(["bun", "run", "app/index.tsx"], {
  stdio: ["inherit", "inherit", "inherit"],
  env: { ...process.env },
})

function cleanup() {
  api.kill(9)
  client.kill(9)
}

process.on("SIGINT", cleanup)
process.on("SIGTERM", cleanup)
process.on("exit", cleanup)

await Promise.all([api.exited, client.exited]).catch(cleanup)
