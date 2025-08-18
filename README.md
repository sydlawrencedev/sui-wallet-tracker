# SUI Wallet Tracker

A web application that displays SUI wallet transactions with GBP values and profit/loss tracking. Users can connect their SUI wallet and view their transaction history with GBP conversions and profit/loss calculations.

## Features

- Connect SUI wallet using Sui Wallet Kit
- View transaction history with date range filtering
- See GBP values for transactions
- Track profit/loss for your SUI holdings
- Responsive design that works on all devices

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm or yarn
- A SUI wallet (like Sui Wallet or Sui Wallet Standard)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd sui-wallet-tracker
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env.local` file in the root directory and add your environment variables:
   ```env
   NEXT_PUBLIC_SUI_NETWORK=mainnet # or testnet/devnet
   ```

4. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Tech Stack

- [Next.js](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type checking
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [@mysten/dapp-kit](https://github.com/MystenLabs/sui/tree/main/sdk/dapp-kit) - SUI wallet connection
- [@mysten/sui.js](https://github.com/MystenLabs/sui/tree/main/sdk/typescript) - SUI blockchain interaction
- [date-fns](https://date-fns.org/) - Date manipulation

## Project Structure

- `/app` - Next.js app directory with pages and routing
- `/components` - Reusable React components
- `/public` - Static assets
- `/styles` - Global styles

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
