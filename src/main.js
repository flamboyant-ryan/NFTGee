import Web3 from "web3"
import { newKitFromWeb3 } from "@celo/contractkit"
import BigNumber from "bignumber.js"
import erc20Abi from "../contract/erc20.abi.json"
import RPGeesAbi from "../contract/create.abi.json"


const ERC20_DECIMALS = 18
const cUSDContractAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"
const RPGeesContractAddress = "0xBa50C0CC6DF0b8e99C8340EacF6a0675c7f2810c"

let kit
let contract
let gees = []

const MAGIC = 1
const PHYSICAL = 0

  const connectCeloWallet = async function (){
    if (window.celo) {
       notification("⚠️ Please approve this DApp to use it.")
        try {
          await window.celo.enable()
          notificationOff()

          const web3 = new Web3(window.celo)
          kit = newKitFromWeb3(web3)

          const accounts = await kit.web3.eth.getAccounts()
          kit.defaultAccount = accounts[0]

          contract = new kit.web3.eth.Contract(RPGeesAbi, RPGeesContractAddress)
        }
        catch (error) {
          notification(`⚠️ ${error}.`)
        }
      }
      else{
          notification("⚠️ Please install the CeloExtensionWallet.")
        }
    }

    async function approve(_price){
      const cUSDContract = new kit.web3.eth.Contract(erc20Abi, cUSDContractAddress)
    
      const result = await cUSDContract.methods
            .approve(RPGeesContractAddress, _price)
            .send({ from: kit.defaultAccount })
        return result
    }
  


  const getBalance = async function() {
    const totalBalance = await kit.getTotalBalance(kit.defaultAccount)
    const cUSDBalance = totalBalance.cUSD.shiftedBy(-ERC20_DECIMALS).toFixed(2)
  	document.querySelector("#balance").textContent = cUSDBalance
  }

const getRPGees = async function () {
      const _length = await contract.methods.getTotalTokenSupply().call()
      const _gees = []
  
      for (let i = 1; i <= _length; i++){
        let _gee = new Promise(async (resolve, reject) => {
          let p = await contract.methods.getCharDetails(i).call()
          resolve({
            index: i,
            name: p[2],
            weapon: p[0],
            clothing: p[1],
            battles_won: p[3],
            type: p[4] == MAGIC? "Magical": "Physical",
            effectiveness: p[5],
            owner: p[6] 
          })
        })
        _gees.push(_gee)
      }
      gees = await Promise.all(_gees)
      renderCharacters(gees)
  }

  function renderCharacters(gees) {
  	document.getElementById("characters").innerHTML = ""
  	gees.forEach((_gee) => {
  		const newDiv = document.createElement("div")
  		newDiv.className = "col-md-6"
  		newDiv.innerHTML = renderTemplate(_gee)
  		document.getElementById("characters").appendChild(newDiv)
  	})
  }

 
  function renderTemplate(gee) {
  	return `
    <div class="card text-white bg-secondary mb-2"">
    <div class="card-header">${identiconTemplate(gee.owner, 16)}</div>
      <div class="card-body text-left p-4 position-relative">
       
        <h5 class="card-title mx-3"> ${gee.name}</h5>
        <div class="d-flex flex-row">
        <span class="mx-3">
        <div class="card-text "> Battles Won: ${gee.battles_won}</div>
        <div class="card-text "> Effectiveness: ${gee.effectiveness} </div>
        <div class="card-text "> Type: ${gee.type} </div>
        </span>

        <span class="" style="">
        <div class="card-text">Weapon: ${gee.weapon} </div>
        <div class="card-text"> Clothing: ${gee.clothing} </div> 
        </span>
        
        </div>
        <a  data-bs-toggle="modal"
        data-bs-target="#fightModal"
        id=${gee.index} href="#" class="btn btn-dark fighters text-white mt-3 mx-3">Challenge</a>
  
      </div>
    </div>
  `
}
  function identiconTemplate(_address, size=48) {
    const icon = blockies
    .create({
      seed: _address,
      size: 8,
      scale: 4,
    })
    .toDataURL()
    return `
      <div class="rounded-circle overflow-hidden d-inline-block border border-white border-2 shadow-sm m-0">
        <a href="https://alfajores-blockscout.celo-testnet.org/address/${_address}/transactions"
            target="_blank">
            <img src="${icon}" alt="${_address}">
        </a>
      </div>
      `  	
    }


  function notification(_text) {
	  document.querySelector(".alert").style.display = "block"
	  document.querySelector("#notification").textContent = _text
	}

  function notificationOff() {
	  document.querySelector(".alert").style.display = "none"
	}


    
  window.addEventListener("load", async () => {
    notification("⌛ Loading...")
    await connectCeloWallet()
    await getBalance()

    let cost = await contract.methods.mint_price().call()
    cost = new BigNumber(cost).shiftedBy(-ERC20_DECIMALS)
    document.getElementById("mint_cost").innerHTML = `mint price: ${cost}`
    await getRPGees()
    notificationOff()
	})
  

  document.querySelector("#characters").addEventListener("click", async (e) => {
  
      const index = e.target.id
      let personal_nfts = gees.filter(g => g.owner == kit.defaultAccount && index != g.index)

      let inner = ""
    for (const g in personal_nfts) {
      inner += `<option value="${personal_nfts[g].index}">${personal_nfts[g].name}</option>`
    }
      if (inner === "") document.getElementById("notice").text = "You cant challenge you own no personal characters"
      document.getElementById("choose").innerHTML = inner
      document.getElementById("choose").setAttribute("data-challenged", index)

 })

  document.querySelector("#mintBtn").addEventListener("click", async (e) => {
    let name = document.getElementById("char_name").value
    
    const cost = await contract.methods.mint_price().call()

    
    notification(`⌛ Minting your Character...`)

    try {
      await approve(cost)
      notification("approve mint price")
    }
    catch (error) {
      notification(`didnt approve ⚠️ ${error}.`)
    }

    notification(`⌛ Please add another zero to the max gas price estimate, or else your minting might fail`)
    try {
      const result = await contract.methods
          .mint_character(name)
          .send({from: kit.defaultAccount })
    }
    catch (error){
      notification(`⚠️ ${error}.`)
    }
    notification(`🎉 You successfully minted your RPGee`)
    getRPGees()
  })

  document.querySelector("#fightBtn").addEventListener("click", async (e) => {
    let select = document.getElementById("choose")
    console.log("got in here")

    let challenged = select.dataset.challenged
    let challenger = select.options[select.selectedIndex].value

    let c = parseInt(challenger)
    
    let battleswon = gees[c-1].battles_won

    console.log(challenged, challenger)
    let result;
    notification(`⌛ Battle if you dare`)
    try {
      const result = await contract.methods
          .fight(...[challenger, challenged])
          .send({from: kit.defaultAccount })

          console.log(result)
          getRPGees()

          let response = battleswon == gees[challenger - 1].battles_won ? "lost": "won"
          notification(`🎉Your character  ${gees[challenger - 1].name} ${response} the battle`)

    
    }
    catch (error){
      notification(`⚠️ ${error}.`)
    }
    
  })


