'use client';

import { useState } from 'react';
import { copyToClipboard } from '../../utils/copyToClipboard';

export default function HowToInvest() {
  const [copied, setCopied] = useState(false);
  const walletAddress = '0xe39d3415072c78f6734135dd6faa1d0d0b62a1a378701a26dc8d38b9e96b85b2';

  const handleCopy = () => {
    copyToClipboard(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="prose prose-invert max-w-none">
      <div className="mb-6">
        <p className="text-red-400 font-medium">
          Capital is at risk. Investors may lose all or part of their investment.<br />
          Past performance is not a reliable indicator of future results.<br />
          Investments in unlisted securities are illiquid and may be difficult to realise.
        </p>
        
        <p className="mt-4">
          You should only be reading this because it has been sent to you directly. This hasn't been publicly promoted anywhere.
        </p>
        
        <p className="font-semibold text-amber-400 mt-4">
          This is not a public offer.
        </p>
        
        <p className="mt-4">
          Only professional investors, certified high net worth individuals or self-certified sophisticated investors should consider investing in AT1000i.
        </p>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">How to buy shares in the fund?</h2>
        
        <div className="mb-6">
          <h3 className="text-xl font-medium text-gray-300 mt-6 mb-3">Buy USDC</h3>
          <p>
            So to start off, you need to buy USDC. You need to do this via an exchange.
            </p>
            <ul className="list-disc pl-6 mb-4" style={{paddingLeft: '20px'}}>
                <li><a href="https://www.coinbase.com/" target="_blank">Coinbase</a></li>
                <li><a href="https://gemini.com/" target="_blank">Gemini</a></li>
                <li><a href="https://www.kraken.com/" target="_blank">Kraken</a></li>
                <li><a href="https://www.binance.com/" target="_blank">Binance</a></li>
          </ul>
            <p>
            You will have a 24 hour cooldown on all new accounts on crypto exchanges. Coinbase Advanced reduces fees, however it can be complicated.
          </p>
          <p className="mt-2">
            You also need to buy SUI, this is a gas token. You will need far less than 1 to complete the process, but best to buy 1.
          </p>
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-medium text-gray-300 mt-6 mb-3">Setup a SUI wallet</h3>
          <p>Download a SUI wallet to your phone. Suggested wallets:</p>
          <ul className="list-disc pl-6 mb-4" style={{paddingLeft: '20px'}}>
            <li><a href="https://phantom.com/" target="_blank">Phantom</a></li>
            <li><a href="https://surfwallet.com/" target="_blank">Surf Wallet</a></li>
            <li><a href="https://slushwallet.com/" target="_blank">Slush</a></li>
          </ul>
          <p>Send your USDC and SUI from Coinbase to your wallet address.</p>
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-medium text-gray-300 mt-6 mb-3">Deposit your funds</h3>
          <p>
            Once you've received it in your wallet. Send it to the address of AT1000i:
          </p>
          <div className="relative">
            <div className="bg-gray-800 p-3 pr-16 rounded-lg mt-2 break-all font-mono">
              {walletAddress}
            </div>
            <button
              onClick={handleCopy}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-700 hover:bg-gray-600 text-xs px-3 py-1 rounded transition-colors"
              title="Copy to clipboard"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p><a 
            href="https://suiscan.xyz/mainnet/account/0xe39d3415072c78f6734135dd6faa1d0d0b62a1a378701a26dc8d38b9e96b85b2" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline inline-block mt-2"
          >
            View on SuiScan
          </a></p>
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-medium text-gray-300 mt-6 mb-3">Receive your AT1000i token</h3>
          <p>
            In the future you will receive an AT1000i token which will be your share of the investment. 
            To sell your investment, you will be able to send the token back to the wallet to receive your funds.
          </p>
          <h3 className="text-xl font-medium text-gray-300 mt-6 mb-3">Sell your shares</h3>
          <p>
            To sell your shares, you will need to send the AT1000i token back to the AT1000i wallet. The wallet will then return your funds as USDC, 48 hours later.
          </p>
        </div>
      </div>

      <div className="mt-12 pt-6 border-t border-gray-700">
        <h2 className="text-2xl font-semibold text-white mb-4">Legal</h2>
        <p>
          By sending your funds to AT1000i, you are agreeing to the terms of this communication.
        </p>

        <p>This website is intended solely for professional investors, high net worth individuals and self-certified sophisticated investors as defined under the Financial Services and Markets Act 2000 (Financial Promotion) Order 2005. The fund is not authorised or regulated by the FCA.</p>


        <h3>For professional investors only</h3>
        <p>
          “This communication is directed only at (i) investment professionals as defined in Article 19(5) of the Financial Services and Markets Act 2000 (Financial Promotion) Order 2005 (‘FPO’), (ii) high net worth companies, unincorporated associations and other persons falling within Article 49 of the FPO, and (iii) any other persons to whom it may lawfully be communicated (together ‘Relevant Persons’). Any investment activity to which this communication relates will only be engaged in with Relevant Persons.”
        </p>

        <h3>For high net worth individuals</h3>

        <p>
          “I declare that I am a certified high net worth individual for the purposes of the Financial Services and Markets Act 2000 (Financial Promotion) Order 2005. I understand that it means I can receive promotions that may not have been approved by an authorised person. I understand that by signing this statement I may lose significant rights.” (Then you are declaring that your income &gt;£100,000 or net assets &gt;£250,000.)
        </p>

        <h3>For self-certified sophisticated investors</h3>

        <p>
          “I declare that I am a self-certified sophisticated investor for the purposes of the Financial Services and Markets Act 2000 (Financial Promotion) Order 2005. I understand that this allows me to receive financial promotions that may not have been approved by a person authorised by the FCA. I am aware that this may expose me to risk of losing all the property invested.” (And then you are declaring at least one qualifying condition, e.g. have made two investments in unlisted companies in the last two years, been a director of a £1m+ company, etc.)
        </p>

        <h3>Public disclosure</h3>

        <p>
          This fund is run by Minith Labs Limited, a company registered in England and Wales with company number 16632010. 
        </p>

      </div>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Management Fees</h2>
        
        <p>
          Management Fees are extracted at the end of each day (00:00 UTC). Using the industry standard 2/20 fee structure. They will be sent from the wallet to the Minith Labs wallet.
        </p>
        
        <p className="mt-2">
          On days where there is a profit, 20% of the profit will be sent from the wallet to the Minith Labs wallet as management fees.
        </p>
        
        <p className="mt-2">
          There will also be a daily management fee of 0.00547945205% (2% annually) of the total value of the wallet. 
        </p>
      </div>
    </div>
  );
}
