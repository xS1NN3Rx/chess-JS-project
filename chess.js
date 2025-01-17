const chessboard = document.getElementById("chessboard");
const board = [];
const pieces = {
  white: {
    king: "♔",
    queen: "♕",
    rook: "♖",
    bishop: "♗",
    knight: "♘",
    pawn: "♙",
  },
  black: {
    king: "♚",
    queen: "♛",
    rook: "♜",
    bishop: "♝",
    knight: "♞",
    pawn: "♟",
  },
};

let gameState = {
  currentPlayer: "white", // 'white' or 'black'
  check: false,
  checkmate: false,
};

const initialBoard = [
  ["♜", "♞", "♝", "♛", "♚", "♝", "♞", "♜"],
  ["♟", "♟", "♟", "♟", "♟", "♟", "♟", "♟"],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ["♙", "♙", "♙", "♙", "♙", "♙", "♙", "♙"],
  ["♖", "♘", "♗", "♕", "♔", "♗", "♘", "♖"],
];

function createChessboard() {
  for (let row = 0; row < 8; row++) {
    board[row] = [];
    for (let col = 0; col < 8; col++) {
      const cell = document.createElement("div");
      cell.classList.add("cell", (row + col) % 2 === 0 ? "white" : "black");
      cell.dataset.row = row;
      cell.dataset.col = col;

      if (initialBoard[row][col]) {
        cell.textContent = initialBoard[row][col];
      }

      cell.addEventListener("click", onCellClick);
      board[row][col] = cell;
      chessboard.appendChild(cell);
    }
  }
}

function getCell(row, col) {
  if (row >= 0 && row < 8 && col >= 0 && col < 8) {
    return board[row][col];
  }
  return null; // Return null for invalid cells
}

let selectedCell = null;

function onCellClick(e) {
  const cell = e.target;

  // If a cell is already selected and clicked again, deselect it
  if (selectedCell === cell) {
    selectedCell.classList.remove("selected");
    selectedCell = null;
    return;
  }

  const row = parseInt(cell.dataset.row);
  const col = parseInt(cell.dataset.col);

  // If no cell is selected, allow selecting a valid piece
  if (!selectedCell && cell.textContent) {
    const pieceColor = getPieceColor(cell.textContent);
    if (pieceColor === gameState.currentPlayer) {
      selectedCell = cell;
      cell.classList.add("selected");
    }
    return;
  }

  // If a cell is already selected and a valid move is attempted
  if (selectedCell) {
    if (movePiece(selectedCell, cell)) {
      selectedCell.classList.remove("selected");
      selectedCell = null;
    }
  }
}

function movePiece(fromCell, toCell) {
  if (gameState.awaitingPromotion) {
    console.log("Cannot move: Awaiting pawn promotion.");
    return false;
  }

  const fromRow = parseInt(fromCell.dataset.row);
  const fromCol = parseInt(fromCell.dataset.col);
  const toRow = parseInt(toCell.dataset.row);
  const toCol = parseInt(toCell.dataset.col);

  const piece = fromCell.textContent;
  const targetPiece = toCell.textContent;

  // Prevent moving onto your own piece
  if (targetPiece && getPieceColor(targetPiece) === gameState.currentPlayer) {
    console.log("You can't take your own piece!");
    return false;
  }

  // Validate the move
  if (isValidMove(piece, fromRow, fromCol, toRow, toCol)) {
    // Handle En Passant
    if (
      (piece === pieces.white.pawn || piece === pieces.black.pawn) &&
      Math.abs(toCol - fromCol) === 1 &&
      !targetPiece
    ) {
      const capturedPawnCell = getCell(fromRow, toCol);
      capturedPawnCell.textContent = "";
    }

    fromCell.textContent = "";
    toCell.textContent = piece;

    // Handle Pawn Promotion
    if ((piece === pieces.white.pawn && toRow === 0) || (piece === pieces.black.pawn && toRow === 7)) {
      handlePawnPromotion(toCell, piece);
    }

    gameState.lastMove = {
      piece,
      fromRow,
      fromCol,
      toRow,
      toCol,
    };

    // Check if the move leaves the king in check
    if (isKingInCheck(gameState.currentPlayer)) {
      console.log("You cannot leave your king in check!");
      // Undo the move
      fromCell.textContent = piece;
      toCell.textContent = targetPiece;
      return false;
    }

    // Update the move list after a successful move
    updateMoveList(fromRow, fromCol, toRow, toCol, piece);

    // Switch turns
    gameState.currentPlayer = gameState.currentPlayer === "white" ? "black" : "white";

    if (gameState.currentPlayer === "black") {
      if (isKingInCheck("black")) {
        console.log("AI's king is in check! Resolving...");

        if (isCheckmate("black")) {
          gameState.checkmate = true;
          console.log("Black is in checkmate! Game over.");
        }
      }

      // Trigger AI move
      setTimeout(aiMove, 500);
    } else {
      if (isKingInCheck("white")) {
        showcheck("your in check")
        console.log("White is in check!");

        if (isCheckmate("white")) {
          gameState.checkmate = true;
          console.log("White is in checkmate! Game over.");
        }
      }
    }

    return true;
  }

  return false;
}



function handlePawnPromotion(cell, piece) {
  const isWhite = piece === pieces.white.pawn;
  const promotionOptions = ["queen", "rook", "bishop", "knight"];

  // Create a modal for promotion
  const modal = document.createElement("div");
  modal.classList.add("promotion-modal");

  // Create modal content container
  const modalContent = document.createElement("div");
  modalContent.classList.add("promotion-modal-content");

  // Add a title to the modal
  const title = document.createElement("p");
  title.textContent = "Promote your pawn";
  modalContent.appendChild(title);

  // Create buttons for each promotion option
  promotionOptions.forEach(option => {
    const button = document.createElement("button");
    button.textContent = option.charAt(0).toUpperCase() + option.slice(1);
    button.classList.add("promotion-button");
    button.addEventListener("click", () => {
      // Replace the pawn with the selected piece
      cell.textContent = isWhite ? pieces.white[option] : pieces.black[option];

      // Remove the modal after selection
      document.body.removeChild(modal);

      gameState.awaitingPromotion = false; // Allow gameplay to resume

      // Switch turn to the opponent
      gameState.currentPlayer = isWhite ? "black" : "white";

      // Trigger AI move if it's AI's turn
      if (gameState.currentPlayer === "black" && !gameState.checkmate) {
        setTimeout(aiMove, 500);
      }
    });
    modalContent.appendChild(button);
  });

  // Add the modal content to the modal
  modal.appendChild(modalContent);

  // Add the modal to the document body
  document.body.appendChild(modal);

  gameState.awaitingPromotion = true; // Prevent moves during promotion
}



// Minimax algorithm with alpha-beta pruning
function minimax(depth, isMaximizing, alpha, beta) {
  if (depth === 0 || gameState.checkmate) {
    return evaluateBoard(); // Evaluate the board state
    
  }

  let bestValue = isMaximizing ? -Infinity : Infinity;
  let foundValidMove = false;

  // Iterate over the board to find all pieces of the current player
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const fromCell = getCell(row, col);
      if (
        fromCell &&
        fromCell.textContent &&
        getPieceColor(fromCell.textContent) === (isMaximizing ? "black" : "white")
      ) {
        // Generate all potential moves for this piece
        for (let toRow = 0; toRow < 8; toRow++) {
          for (let toCol = 0; toCol < 8; toCol++) {
            const toCell = getCell(toRow, toCol);
            if (toCell && isValidMove(fromCell.textContent, row, col, toRow, toCol)) {
              // Simulate the move
              const originalFromContent = fromCell.textContent;
              const originalToContent = toCell.textContent;

              fromCell.textContent = "";
              toCell.textContent = originalFromContent;


              // Evaluate the new board state
              const evaluation = minimax(depth - 1, !isMaximizing, alpha, beta);

              // Undo the move
              fromCell.textContent = originalFromContent;
              toCell.textContent = originalToContent;

              if (isMaximizing) {
                bestValue = Math.max(bestValue, evaluation);
                alpha = Math.max(alpha, bestValue);
              } else {
                bestValue = Math.min(bestValue, evaluation);
                beta = Math.min(beta, bestValue);
              }

              // Alpha-Beta Pruning
              if (beta <= alpha) {
                return bestValue; // Prune the search tree
              }

              foundValidMove = true;
            }
          }
        }
      }
    }
  }

  if (!foundValidMove) {
    console.log("No valid moves found at depth:", depth);
  }

  return bestValue;
}




////////////////////
function evaluateBoard() {
  let score = 0;
  const threatMap = buildThreatMap(); // Precompute threats

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const cell = getCell(row, col);
      if (cell && cell.textContent) {
        const piece = cell.textContent;
        const color = getPieceColor(piece);
        const value = getPieceValue(piece);
        const mobility = getPieceMobility(piece, row, col);

        score += color === "black" ? value + mobility : -(value + mobility);

        // Penalize under-threat pieces
        if (threatMap[row][col]) {
          score += color === "black" ? -value * 0.5 : value * 0.5;
        }
      }
    }
  }

  return score;
}

function buildThreatMap() {
  const threatMap = Array.from({ length: 8 }, () => Array(8).fill(false));

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const cell = getCell(row, col);
      if (cell && cell.textContent) {
        const piece = cell.textContent;
        const color = getPieceColor(piece);
        const moves = getPiecePossibleMoves(piece, row, col);

        for (let [r, c] of moves) {
          if (isValidMovePosition(r, c)) {
            threatMap[r][c] = true;
          }
        }
      }
    }
  }

  return threatMap;
}

function getPiecePossibleMoves(piece, row, col) {
  const color = getPieceColor(piece);
  const directions = {
    knight: [
      [-2, -1], [-2, 1], [2, -1], [2, 1],
      [-1, -2], [-1, 2], [1, -2], [1, 2],
    ],
    bishop: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
    rook: [[-1, 0], [1, 0], [0, -1], [0, 1]],
  };

  switch (piece) {
    case "♘":
    case "♞":
      return directions.knight.map(([dr, dc]) => [row + dr, col + dc]).filter(([r, c]) =>
        isValidMovePosition(r, c) && !isBlockedBySameColor([r, c], color)
      );
    case "♗":
    case "♝":
      return getSlidingMoves(row, col, directions.bishop, color);
    case "♖":
    case "♜":
      return getSlidingMoves(row, col, directions.rook, color);
    case "♕":
    case "♛":
      return getSlidingMoves(row, col, directions.bishop.concat(directions.rook), color);
    case "♙":
    case "♟":
      return calculatePawnMoves(row, col, color);
    default:
      return [];
  }
}

function getSlidingMoves(row, col, directions, color) {
  const moves = [];
  for (let [dr, dc] of directions) {
    let r = row + dr;
    let c = col + dc;
    while (isValidMovePosition(r, c)) {
      moves.push([r, c]);
      if (getCell(r, c).textContent) break; // Stop if blocked by any piece
      r += dr;
      c += dc;
    }
  }
  return moves.filter(move => !isBlockedBySameColor(move, color));
}


function getPieceMobility(piece, row, col) {
  let mobility = 0;
  const color = getPieceColor(piece); // Get color for pawns

  switch (piece) {
    case "♘":
    case "♞":
      mobility = calculateKnightMoves(row, col).filter(move => !isBlockedBySameColor(move, color)).length;
      break;
    case "♗":
    case "♝":
      mobility = calculateBishopMoves(row, col).filter(move => !isBlockedBySameColor(move, color)).length;
      break;
    case "♖":
    case "♜":
      mobility = calculateRookMoves(row, col).filter(move => !isBlockedBySameColor(move, color)).length;
      break;
    case "♕":
    case "♛":
      mobility = calculateQueenMoves(row, col).filter(move => !isBlockedBySameColor(move, color)).length;
      break;
    case "♙":
    case "♟":
      mobility = calculatePawnMoves(row, col, color).filter(move => !isBlockedBySameColor(move, color)).length;
      break;
  }

  return mobility;
}

function getPieceValue(piece) {
  switch (piece) {
    case "♙": case "♟": return 1; // Pawn
    case "♘": case "♞": return 3; // Knight
    case "♗": case "♝": return 3; // Bishop
    case "♖": case "♜": return 5; // Rook
    case "♕": case "♛": return 9; // Queen
    case "♔": case "♚": return 10; // King (arbitrary high value)
    default: return 0;
  }
}

function calculateKnightMoves(row, col) {
  const moves = [];
  const directions = [
    [-2, -1], [-2, 1], [2, -1], [2, 1], 
    [-1, -2], [-1, 2], [1, -2], [1, 2]
  ];

  for (let [dr, dc] of directions) {
    const newRow = row + dr;
    const newCol = col + dc;
    if (isValidMovePosition(newRow, newCol)) {
      moves.push([newRow, newCol]);
    }
  }

  return moves;
}

function isValidMovePosition(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function calculateBishopMoves(row, col) {
  const moves = [];
  const directions = [
    [-1, -1], [-1, 1], [1, -1], [1, 1]
  ];

  for (let [dr, dc] of directions) {
    let r = row + dr;
    let c = col + dc;
    while (isValidMovePosition(r, c)) {
      moves.push([r, c]);
      if (getCell(r, c).textContent) break; // Stop if blocked by a piece
      r += dr;
      c += dc;
    }
  }

  return moves;
}

function calculateRookMoves(row, col) {
  const moves = [];
  const directions = [
    [-1, 0], [1, 0], [0, -1], [0, 1]
  ];

  for (let [dr, dc] of directions) {
    let r = row + dr;
    let c = col + dc;
    while (isValidMovePosition(r, c)) {
      moves.push([r, c]);
      if (getCell(r, c).textContent) break; // Stop if blocked by a piece
      r += dr;
      c += dc;
    }
  }

  return moves;
}

function calculateQueenMoves(row, col) {
  let moves = calculateRookMoves(row, col); // Get rook-like moves
  moves = moves.concat(calculateBishopMoves(row, col)); // Add bishop-like moves
  return moves;
}

function calculatePawnMoves(row, col, color) {
  const moves = [];
  const direction = color === "black" ? 1 : -1; // Black pawns move down, white move up

  // Regular move (one square forward)
  if (isValidMovePosition(row + direction, col) && !getCell(row + direction, col).textContent) {
    moves.push([row + direction, col]);
    // Double move (first move only)
    if ((color === "black" && row === 1) || (color === "white" && row === 6)) {
      if (!getCell(row + direction * 2, col).textContent) {
        moves.push([row + direction * 2, col]);
      }
    }
  }

  // Capture moves (diagonal)
  const captureDirections = [
    [direction, -1], [direction, 1]
  ];
  for (let [dr, dc] of captureDirections) {
    if (isValidMovePosition(row + dr, col + dc)) {
      const toCell = getCell(row + dr, col + dc);
      if (toCell && getPieceColor(toCell.textContent) !== color) {
        moves.push([row + dr, col + dc]);
      }
    }
  }

  return moves;
}

function isBlockedBySameColor(move, color) {
  const [row, col] = move;
  const cell = getCell(row, col);
  return cell && getPieceColor(cell.textContent) === color;
}




///////////


// AI move function using minimax
let awaitingPromotion = false; // Tracks if promotion is in progress

function showPromotionOptions(cell, color) {
  awaitingPromotion = true; // Block other moves
  const dropdown = document.getElementById("promotionDropdown");
  dropdown.style.display = "block";
  dropdown.style.position = "absolute";
  dropdown.style.left = `${cell.offsetLeft}px`;
  dropdown.style.top = `${cell.offsetTop}px`;

  dropdown.onchange = function () {
    const selectedValue = dropdown.value;
    dropdown.style.display = "none";

    if (selectedValue) {
      // Update the pawn to the selected piece
      cell.textContent = selectedValue === "queen" ? (color === "white" ? "♕" : "♛") :
                         selectedValue === "rook" ? (color === "white" ? "♖" : "♜") :
                         selectedValue === "bishop" ? (color === "white" ? "♗" : "♝") :
                         (color === "white" ? "♘" : "♞");
    }

    awaitingPromotion = false; // Allow gameplay to continue
    dropdown.value = ""; // Reset dropdown

    if (!playerTurn) {
      aiMove(); // Trigger AI move if it’s AI's turn
    }
  };
}


function aiMove() {
  if (awaitingPromotion) {
    console.log("AI move delayed: awaiting promotion.");
    return; // Exit if promotion is pending
  }
  if (gameState.awaitingPromotion) {
    console.log("AI move delayed: awaiting promotion.");
    return; // Exit if promotion is pending
  }

  let bestMove = null;
  let bestValue = -Infinity; // Start with a very low value for maximizing
  let foundMove = false;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const fromCell = getCell(row, col);
      if (fromCell && fromCell.textContent && getPieceColor(fromCell.textContent) === "black") {
        for (let toRow = 0; toRow < 8; toRow++) {
          for (let toCol = 0; toCol < 8; toCol++) {
            const toCell = getCell(toRow, toCol);

            if (
              toCell &&
              isValidMove(fromCell.textContent, row, col, toRow, toCol) &&
              (!toCell.textContent || getPieceColor(toCell.textContent) === "white")
            ) {
              // Simulate the move
              const originalFromContent = fromCell.textContent;
              const originalToContent = toCell.textContent;

              fromCell.textContent = "";
              toCell.textContent = originalFromContent;

              // Evaluate the board after this move
              const evaluation = minimax(2, false, -Infinity, Infinity); // Reduce depth to 2 for performance

              // Undo the move
              fromCell.textContent = originalFromContent;
              toCell.textContent = originalToContent;

              if (evaluation > bestValue) {
                bestValue = evaluation;
                bestMove = { from: fromCell, to: toCell };
                foundMove = true;
              }
            }
          }
        }
      }
    }
  }

  if (foundMove) {
    movePiece(bestMove.from, bestMove.to);

    // Handle AI pawn promotion
    const piece = bestMove.to.textContent;
    if (piece === "♟" && bestMove.to.dataset.row === "7") {
      awaitingPromotion = true;

      // Simulate promotion (AI automatically promotes to queen)
      setTimeout(() => {
        bestMove.to.textContent = "♛"; // Promote to queen
        awaitingPromotion = false;
        console.log("AI pawn promoted to Queen.");
      }, 1000);
    }
  } else {
    console.log("AI has no valid moves. Checkmate or stalemate.");
  }
}









function getPieceColor(piece) {
  return Object.values(pieces.white).includes(piece) ? "white" : "black";
}

function isValidMove(piece, fromRow, fromCol, toRow, toCol) {
  const rowDiff = Math.abs(toRow - fromRow);
  const colDiff = Math.abs(toCol - fromCol);

  switch (piece) {
    case pieces.white.king:
    case pieces.black.king:
      return rowDiff <= 1 && colDiff <= 1;

    case pieces.white.queen:
    case pieces.black.queen:
      return (
        (rowDiff === colDiff || rowDiff === 0 || colDiff === 0) &&
        isPathClear(fromRow, fromCol, toRow, toCol)
      );

    case pieces.white.rook:
    case pieces.black.rook:
      return (
        (rowDiff === 0 || colDiff === 0) && isPathClear(fromRow, fromCol, toRow, toCol)
      );

    case pieces.white.bishop:
    case pieces.black.bishop:
      return rowDiff === colDiff && isPathClear(fromRow, fromCol, toRow, toCol);

    case pieces.white.knight:
    case pieces.black.knight:
      return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);

    case pieces.white.pawn:
    case pieces.black.pawn: {
      const direction = piece === pieces.white.pawn ? -1 : 1;
      const startingRow = piece === pieces.white.pawn ? 6 : 1;

      // Move forward one square
      if (toCol === fromCol && toRow === fromRow + direction && !getCell(toRow, toCol).textContent) {
        return true;
      }

      // Move forward two squares from starting position
      if (
        fromRow === startingRow &&
        toCol === fromCol &&
        toRow === fromRow + 2 * direction &&
        !getCell(toRow, toCol).textContent &&
        !getCell(fromRow + direction, fromCol).textContent
      ) {
        return true;
      }

      // Capture diagonally
      if (
        Math.abs(toCol - fromCol) === 1 &&
        toRow === fromRow + direction &&
        getCell(toRow, toCol).textContent
      ) {
        return true;
      }

      // En Passant
      const lastMove = gameState.lastMove;
      if (
        Math.abs(toCol - fromCol) === 1 &&
        toRow === fromRow + direction &&
        lastMove &&
        lastMove.piece === (piece === pieces.white.pawn ? pieces.black.pawn : pieces.white.pawn) &&
        Math.abs(lastMove.fromRow - lastMove.toRow) === 2 &&
        lastMove.toRow === fromRow &&
        lastMove.toCol === toCol
      ) {
        return true;
      }
      break;
    }

    default:
      return false;
  }
}

function isKingInCheck(color) {
  let kingCell = null;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const cell = getCell(row, col);
      if (cell && cell.textContent === (color === "white" ? pieces.white.king : pieces.black.king)) {
        kingCell = cell;
        break;
      }
    }
    if (kingCell) break;
  }

  if (!kingCell) return false;

  const kingRow = parseInt(kingCell.dataset.row);
  const kingCol = parseInt(kingCell.dataset.col);

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const cell = getCell(row, col);
      if (cell && cell.textContent && getPieceColor(cell.textContent) !== color) {
        if (isValidMove(cell.textContent, row, col, kingRow, kingCol)) {
          return true;
        }
      }
    }
  }

  return false;
}

// Add a modal for Game Over
const modal = document.createElement("div");
modal.id = "gameOverModal";
modal.style.display = "none";
modal.style.position = "fixed";
modal.style.top = "50%";
modal.style.left = "50%";
modal.style.transform = "translate(-50%, -50%)";
modal.style.backgroundColor = "#fff";
modal.style.border = "2px solid #000";
modal.style.borderRadius = "8px";
modal.style.padding = "20px";
modal.style.textAlign = "center";
modal.style.zIndex = "1000";

const modalMessage = document.createElement("p");
modalMessage.id = "gameOverMessage";
modalMessage.style.margin = "0 0 20px";
modal.appendChild(modalMessage);

const restartButton = document.createElement("button");
restartButton.textContent = "Restart Game";
restartButton.style.padding = "10px 20px";
restartButton.style.fontSize = "16px";
restartButton.style.cursor = "pointer";
restartButton.onclick = restartGame;
modal.appendChild(restartButton);


document.body.appendChild(modal);



const modal2 = document.createElement("div");
modal2.id = "gameOverModal";
modal2.style.display = "none";
modal2.style.position = "fixed";
modal2.style.top = "50%";
modal2.style.left = "50%";
modal2.style.transform = "translate(-50%, -50%)";
modal2.style.backgroundColor = "#fff";
modal2.style.border = "2px solid #000";
modal2.style.borderRadius = "8px";
modal2.style.padding = "20px";
modal2.style.textAlign = "center";
modal2.style.zIndex = "1000";

const modal2Message = document.createElement("p");
modal2Message.id = "checkMessage";
modal2Message.style.margin = "0 0 20px";
modal2.appendChild(modal2Message);

const checkButton = document.createElement("button");
checkButton.textContent = "continue Game";
checkButton.style.padding = "10px 20px";
checkButton.style.fontSize = "16px";
checkButton.style.cursor = "pointer";
checkButton.onclick = hidecheck;
modal2.appendChild(checkButton);


document.body.appendChild(modal2);

// Function to display the Game Over modal
function showGameOver(message) {
  modalMessage.textContent = message;
  modal.style.display = "block";
}

function showcheck(message) {
  modal2Message.textContent = message;
  modal2.style.display = "block";
}
function hidecheck() {
  modal2.style.display = "none";
}
// Function to hide the Game Over modal
function hideGameOver() {
  modal.style.display = "none";
}

// Restart the game
function restartGame() {
  // Hide the Game Over modal
  hideGameOver();

  // Reset the game state
  gameState = {
    currentPlayer: "white",
    check: false,
    checkmate: false,
  };

  // Reset the chessboard
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const cell = board[row][col];
      cell.textContent = initialBoard[row][col] || "";
      cell.classList.remove("selected");
    }
  }

  console.log("Game restarted!");
}

// Modify the `isCheckmate` function to trigger the game over modal
function isCheckmate(color) {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const fromCell = getCell(row, col);
      if (fromCell && fromCell.textContent && getPieceColor(fromCell.textContent) === color) {
        for (let toRow = 0; toRow < 8; toRow++) {
          for (let toCol = 0; toCol < 8; toCol++) {
            const toCell = getCell(toRow, toCol);
            if (
              toCell &&
              isValidMove(fromCell.textContent, row, col, toRow, toCol) &&
              (!toCell.textContent || getPieceColor(toCell.textContent) !== color)
            ) {
              const originalFromContent = fromCell.textContent;
              const originalToContent = toCell.textContent;

              fromCell.textContent = "";
              toCell.textContent = originalFromContent;

              const isStillInCheck = isKingInCheck(color);

              fromCell.textContent = originalFromContent;
              toCell.textContent = originalToContent;

              if (!isStillInCheck) {
                return false;
              }
            }
          }
        }
      }
    }
  }

  // Trigger the Game Over modal
  const winningColor = color === "white" ? "Black" : "White";
  showGameOver(`Checkmate! ${winningColor} Wins!`);
  return true;
}

function isPathClear(fromRow, fromCol, toRow, toCol) {
  const rowStep = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
  const colStep = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;

  let currentRow = fromRow + rowStep;
  let currentCol = fromCol + colStep;

  while (currentRow !== toRow || currentCol !== toCol) {
    if (getCell(currentRow, currentCol).textContent) {
      return false;
    }
    currentRow += rowStep;
    currentCol += colStep;
  }
  return true;
}

createChessboard();

// Array to track the history of moves
let moveHistory = [];

// Function to update the move list
function updateMoveList(fromRow, fromCol, toRow, toCol, piece) {
  const moveListElement = document.getElementById("move-list");
  if (!moveListElement) {
    console.error("Move list container not found!");
    return;
  }

  // Format the move
  const moveNotation = `${piece} (${String.fromCharCode(97 + fromCol)}${8 - fromRow}) to (${String.fromCharCode(97 + toCol)}${8 - toRow})`;
  moveHistory.push(moveNotation);

  // Update the UI
  const moveItem = document.createElement("li");
  moveItem.textContent = moveNotation;
  moveListElement.querySelector("ul").appendChild(moveItem);

  // Scroll to the bottom
  moveListElement.scrollTop = moveListElement.scrollHeight;
}


// Call this function within your existing move logic when a move is made.
// Example:
// updateMoveList(fromRow, fromCol, toRow, toCol, piece);
