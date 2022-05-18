import React, { useEffect, useState } from 'react';
import twitterLogo from './assets/twitter-logo.svg';
import './App.css';
import idl from './idl.json';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';
import kp from './keypair.json';
import BN from 'bn.js';

const { SystemProgram } = web3;

const arr = Object.values(kp._keypair.secretKey)
const secret = new Uint8Array(arr)
const baseAccount = web3.Keypair.fromSecretKey(secret)

const programID = new PublicKey(idl.metadata.address);

const network = clusterApiUrl('devnet');

const opts = {
  preflightCommitment: "processed"
}

// Constants
const TWITTER_HANDLE = '_buildspace';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;


const App = () => {

  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [gifList, setGifList] = useState([]);
  const [inputAmount, setInputAmount] = useState(0);
  
  const checkIfWalletIsConnected = async() => {
    try {
      const solana = { window };

      if (solana) {
        if(solana.isPhantom) {
          console.log("Phantom wallet found");

          const response = await solana.connect({ onlyIfTrusted: true});
          console.log("Connected with publicKey:", response.publicKey.toString());

          setWalletAddress(response.publicKey.toString());

        }
    } else {
      alert("Phantom wallet not found! Get a Phantom wallet");
    }

    } catch(error) {
      console.error(error);
    }
  };

  const connectWallet = async() => {
    const { solana } = window;

    if(solana) {
      const response = await solana.connect();
      console.log('Connected with PublicKey:', response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  const sendGif = async () => {
    if (inputValue.length === 0) {
      console.log('No Gif Link given!');
      return
    } 
    setInputValue('');
    console.log('Gif Link:', inputValue);
    try {
      const provider = getProvider();
      const program =  new Program(idl, programID, provider);

      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log("Gif successfully sent to program", inputValue)

      await getGifList();
    } catch (error) {
      console.log("Error sending GIF:", error)
    }
  };


  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  };

  const sendAmount = async(item, index) => {
    if (inputAmount === 0) {
      console.log("Specify the amount");
      return
    }
    
    console.log("Tip amount", inputAmount);
    try {
      const provider = getProvider();
      const program =  new Program(idl, programID, provider);

      await program.rpc.tipGif(
        new BN(inputAmount),
        new BN(index),
        {
          accounts: {
            baseAccount: baseAccount.publicKey,
            user: provider.wallet.publicKey,
            owner: item.userAddress,
            systemProgram: SystemProgram.programId,
          },
        }
      );
      console.log("Amount:",inputAmount ,"successfully sent to owner")

      setInputAmount(0);


    } catch(error) {
      console.log("Error sending amount", error)
    }
  }

  const onInputAmountChange = (event) => {
    const { value } = event.target;
    setInputAmount(value);
    console.log("input tip:", inputAmount)
  }

  const updateVote = async(index) => {
    const provider = getProvider();
    const program = new Program(idl, programID, provider);

    const Vx = await program.rpc.updateItem(
      new BN(index),
      {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      }
    );
    
    console.log("Voted successfully", Vx)


  }

  

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection, window.solana, opts.preflightCommitment,
    );
      return provider;
  }

  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log("ping...!!")
      
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount]
      });

      console.log("Created new BaseAccount with address:", baseAccount.publicKey.toString())
      await getGifList();

    } catch(error) {
      console.log("Error creating BaseAccount:", error)
    }
  }

  const renderNotConnectedContainer = () => (
    <button
     className = "cta-button connect-Wallet-button"
     onClick={connectWallet}
      >
        Connect to wallet
     </button>
  );

  const renderConnectedContainer = () => {
    if (gifList === null) {
      return (
        <div className="connected-container">
          <button className="cta-button submit-gif-button" onClick={createGifAccount}>
            Do One-Time Initialization for GIF program Account
          </button>
        </div>
      )
    } else {
      return(
        <div className="connected-container">
          <form onSubmit={(event) => {
              event.preventDefault();
              sendGif();
            }}
          >
            <input 
              type="text" 
              placeholder="Enter Gif Link!" 
              value={inputValue}
              onChange={onInputChange}
            />
            <button type="submit" className="cta-button submit_gif-button">Submit</button>
          </form>
          
          <div className="gif-grid">
            {gifList.map((item, index) => (
              <div className="gif-item" key={index}>
                <form onSubmit={(event) => {
                event.preventDefault();
                sendAmount(item, index);
                }}
                >
                <img src={item.gifLink} />
                <button className="upvote-button"
                 onClick={(event) => { 
                   event.preventDefault();
                   updateVote(index);
                   }}
                   >
                     upvote {item.vote.toString()}
                </button>
                <p className="user-address">User Address - {item.userAddress.toString()}</p>
                <input 
                  type="number" 
                  placeholder="Enter the tip amount" 
                  value={inputAmount}
                  onChange={onInputAmountChange}
                />
                <button type="submit" className="cta-button submit_gif-button">Tip</button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )
    } 
  }
    

  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  const getGifList = async() => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(baseAccount.publicKey);

      console.log("Got the account", account);

      setGifList(account.gifList)

    } catch (error) {
      console.log("Error in getGifList:", error)
      setGifList(null);
    }
  }


  useEffect(() => {
    if (walletAddress) {
      console.log('Fetching GIF list...');

      getGifList()
    }
  }, [walletAddress]);

  return (
    <div className="App">
      <div className={walletAddress ? 'authed-container' : 'container'}>
        <div className="header-container">
          <p className="header">🖼 Football Celebration GIFs Portal</p>
          <p className="sub-text">
            View your awesome collection ✨
          </p>
          {!walletAddress && renderNotConnectedContainer()}
          {walletAddress && renderConnectedContainer()}
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
