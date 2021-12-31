// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";


interface IERC20Token {
  function transfer(address, uint256) external returns (bool);
  function approve(address, uint256) external returns (bool);
  function transferFrom(address, address, uint256) external returns (bool);
  function totalSupply() external view returns (uint256);
  function balanceOf(address) external view returns (uint256);
  function allowance(address, address) external view returns (uint256);

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);
}


contract RPGees is ERC721{
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;


    address internal _owner;
    address internal cUsdTokenAddress = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;
    uint offset = 1000000000000000000;
    uint public mint_price = 3 * offset;
    IERC20Token ERC = IERC20Token(cUsdTokenAddress);

    uint8 PHYSICAL = 1;
    uint8 MAGIC = 2;

    struct Character{
        string weapon;
        string clothing;
        string name;
        uint battles_won;
        uint _type;
        uint effectiveness;
    }
    mapping (uint => Character) internal characters;

    
    string[] physical_items = ["sword", "mace", "gauntlets", "war hammer"];
    string[] magic_items = ["staff", "orb", "wand" ,"book" ];
    string[] appends = [
            "of assaulting",
            "of gibborim",
            "of peace",
            "of power",
            "of nilfgard",
            "of mages",
            "of healing",
            "of the people"
            ];
    string[] titles = ["mage", "scholar", "bezerker", "warrior"];
    string[] prepends = ["enchanted", "fire", "glorious", "weird", "flimsy", "necro", "chakra", "shiny"];
    string[] clothing = [
            "pirate tunics",
            "smart tunics",
            "war armour of lagos",
            "simple tunic garments",
            "simple leather garments",
            "jester's costume",
            "flowing gown",
            "tracksuit of old",
            "gold plated armour",
            "birthday suit",
            "spidey suit of olde",
            "satoshi shorts (just the shorts)"
        ];

    constructor() ERC721("RPG Homies", "RPGees")  {
        _owner = msg.sender;
    }

    modifier only_owner() {
        require(msg.sender == _owner);
        _;
    }

    function _get_random(uint nonce) public view returns (uint256) {
        return uint(keccak256(abi.encodePacked(block.timestamp, nonce)));
    }

    function _get_random_prepend(uint nonce) public view returns (string memory){
        return prepends[_get_random(nonce) % prepends.length];
    }

    function _get_random_append(uint nonce) public view returns (string memory){
        return appends[_get_random(nonce) % appends.length];
    }

    function _get_random_clothing(uint nonce) public view returns (string memory){
        return clothing[_get_random(nonce) % clothing.length];
    }

    function _assign_weapon(uint _type) public view returns (string memory){
        string memory weapon = "";
        string memory pre = "";
        string memory post = "";

        // one in ten chance to get a weapon with both prepend and append
        if (_get_random(_type) % 10 == 7){
            pre = _get_random_prepend(_type);
            post = _get_random_append(_type);
        }
        // if not just give either only append or prepend
        else {
            if (_get_random(_type) % 2 == 0){
                pre = _get_random_prepend(_type);
            }
            else{
                post = _get_random_append(_type);
            }
        }

        if (_type == MAGIC){
            weapon = magic_items[_get_random(_type) % magic_items.length];

        }else{
            weapon = physical_items[_get_random(_type) % physical_items.length];
        }

        return string(abi.encodePacked(pre, " ", weapon, " ", post));

    }

    function mint_character(string memory name) public returns (uint256, uint256) {

        // mint a new character by first
        // require(
        //     ERC.transferFrom(
        //         msg.sender,
        //         _owner,
        //         mint_price
        //     ),
        //     "Could not initialiate transfer"
        // );

        _tokenIds.increment();

        uint256 newItemId = _tokenIds.current();

        uint nonce = uint(keccak256(abi.encodePacked(name)));

        uint _type = (_get_random(nonce) % 2) + 1;


        string memory char_name;
        string memory weapon;

        if (_type == MAGIC){
            if (! (_get_random(nonce) % 1000 == 7)){
                char_name = string(abi.encode(titles[_get_random(nonce) % 2]," ", name));
            }
            // a one in a thousand chance of having a magic type normal character
            else{
                char_name = string(abi.encode(titles[(_get_random(nonce) % 2) + 2]," ", name));

            }
            weapon = _assign_weapon(MAGIC);
        }

        if (_type == PHYSICAL){
            if (! (_get_random(nonce) % 1000 == 7)){
                char_name = string(abi.encode(titles[(_get_random(nonce) % 2) + 2]," ", name));
            }
            // a one in a thousand chance of having a normal type magic character
            else{
                char_name = string(abi.encode(titles[_get_random(nonce) % 2]," ", name));
            }
            weapon = _assign_weapon(PHYSICAL);
        }

        string memory char_clothing = _get_random_clothing(nonce);

        // all characters start with a random effectiveness assigned, capped at 20
        // effectiveness helps in fights
        uint effectiveness = _get_random(nonce) % 20;

        // add character to mapping and mint
        characters[newItemId] = Character(
            weapon,
            char_clothing,
            char_name,
            0,
            _type,
            effectiveness
        );
        _mint(msg.sender, newItemId);
        
        return (newItemId, nonce);
    }

    function change_mint_price(uint newprice) only_owner public {
        mint_price = newprice * offset;
    }

    function fight(uint challenger_id, uint challenged_id) public {
    }

   
  
    function tokenURI(uint256 token_id) override public view returns (string memory) {
        
        Character storage char = characters[token_id];
        string memory json = string(abi.encodePacked("{'name': '", char.name, "', 'battles won': '", char.battles_won, 
            "'effectiveness': '", char.effectiveness,  "', 'type': '", char._type == MAGIC ? "Magic type": "physical type",
            "'weapon': '", char.weapon, "'clothing': '", char.clothing,  "'}"));
        return string(abi.encodePacked("data:application/json,", json));
    }

}