const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
  parent: "game-container",
};

const game = new Phaser.Game(config);

let player;
let bullets;
let enemies;
let healthPickups;
let boss;
let defeatedEnemies = 0;
const bossSpawnCount = 10;

const gameState = {
  enemySpawnInterval: 600,
  lastShootTime: 0,
  shootingRate: 300,
  enemyBaseHealth: 10,
  playerBaseDamage: 10,
  playerDamageLevel: 1,
  playerDamageCost: 100,
  playerSpeed: 5,
  shootingRateLevel: 1,
  shootingRateCost: 100,
  playerMaxHealth: 100,
  playerHealthLevel: 1,
  playerHealthCost: 150,
  bulletCountLevel: 1,
  bulletCountCost: 200,
  currency: 0,
  healthPickupChance: 0.1,
};

function preload() {
  this.load.image("player", "./assets/player.png");
  this.load.image("bullet", "./assets/finger.png");
  this.load.image("enemy", "./assets/enemy.png");
  this.load.image("healthPickup", "./assets/healthHeart.png");
  this.load.image("boss", "./assets/boss-enemy.png");
}

function create() {
  player = this.physics.add.sprite(400, 300, "player");
  player.setCollideWorldBounds(true);
  player.health = gameState.playerMaxHealth;

  createHealthBar.call(this);
  createUI.call(this);

  healthPickups = this.physics.add.group();
  this.physics.add.overlap(
    player,
    healthPickups,
    collectHealthPickup,
    null,
    this
  );

  bullets = this.physics.add.group();
  this.physics.world.setBounds(0, 0, config.width, config.height);

  enemies = this.physics.add.group();
  this.physics.add.collider(enemies, enemies);

  this.enemySpawner = this.time.addEvent({
    delay: gameState.enemySpawnInterval,
    callback: spawnEnemy,
    callbackScope: this,
    loop: true,
  });

  this.difficultyIncreaser = this.time.addEvent({
    delay: 10000,
    callback: increaseDifficulty,
    callbackScope: this,
    loop: true,
  });

  this.shooter = this.time.addEvent({
    delay: gameState.shootingRate,
    callback: shoot,
    callbackScope: this,
    loop: true,
  });

  this.physics.add.collider(bullets, enemies, bulletHitEnemy, null, this);
  this.physics.add.collider(player, enemies, playerHitEnemy, null, this);

  createRestartButton.call(this);
  addUpgradeListeners.call(this);
}

function update() {
  handlePlayerMovement.call(this);
  handleBulletBounds.call(this);
  handleEnemyMovement.call(this);

  if (boss && boss.active) {
    this.physics.moveToObject(boss, player, 100);
    boss.healthText.setPosition(boss.x, boss.y - 40);
  }

  updateHealthBar.call(this);
  updateCurrencyText.call(this);
}

function createHealthBar() {
  this.healthBarBg = this.add.graphics();
  this.healthBarBg.fillStyle(0x808080, 1);
  this.healthBarBg.fillRect(10, config.height - 20, 200, 10);

  this.healthBarFill = this.add.graphics();

  this.healthBarBorder = this.add.graphics();
  this.healthBarBorder.lineStyle(2, 0xffffff, 1);
  this.healthBarBorder.strokeRect(10, config.height - 20, 200, 10);
}

function createUI() {
  this.damageText = this.add.text(
    10,
    30,
    `Damage: ${gameState.playerBaseDamage} (Level ${gameState.playerDamageLevel}) Cost: ${gameState.playerDamageCost}`,
    { fontSize: "16px", fill: "#fff" }
  );
  this.shootingRateText = this.add.text(
    10,
    50,
    `Shooting Rate: ${gameState.shootingRate} (Level ${gameState.shootingRateLevel}) Cost: ${gameState.shootingRateCost}`,
    { fontSize: "16px", fill: "#fff" }
  );
  this.healthText = this.add.text(
    10,
    70,
    `Max Health: ${gameState.playerMaxHealth} (Level ${gameState.playerHealthLevel}) Cost: ${gameState.playerHealthCost}`,
    { fontSize: "16px", fill: "#fff" }
  );
  this.bulletCountText = this.add.text(
    10,
    90,
    `Bullet Count: ${gameState.bulletCountLevel} Cost: ${gameState.bulletCountCost}`,
    { fontSize: "16px", fill: "#fff" }
  );
  this.currencyText = this.add.text(10, 10, "Currency: 0", {
    fontSize: "16px",
    fill: "#fff",
  });

  this.upgradeText = this.add
    .text(
      config.width - 10,
      10,
      "Press 1: Damage\nPress 2: Shooting Rate\nPress 3: Max Health\nPress 4: Bullet Count",
      { fontSize: "16px", fill: "#fff", align: "right" }
    )
    .setOrigin(1, 0);
}

function createRestartButton() {
  this.restartButton = this.add.text(
    config.width / 2,
    config.height / 2,
    "Restart",
    {
      fontSize: "32px",
      fill: "#fff",
    }
  );
  this.restartButton.setOrigin(0.5);
  this.restartButton.setInteractive();
  this.restartButton.on("pointerdown", restartGame, this);
  this.restartButton.setVisible(false);
}

function addUpgradeListeners() {
  this.input.keyboard.on("keydown-ONE", upgradeDamage, this);
  this.input.keyboard.on("keydown-TWO", upgradeShootingRate, this);
  this.input.keyboard.on("keydown-THREE", upgradeMaxHealth, this);
  this.input.keyboard.on("keydown-FOUR", upgradeBulletCount, this);
}

function handlePlayerMovement() {
  const keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
  const keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
  const keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
  const keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

  if (keyA.isDown) {
    player.x -= gameState.playerSpeed;
  } else if (keyD.isDown) {
    player.x += gameState.playerSpeed;
  }

  if (keyW.isDown) {
    player.y -= gameState.playerSpeed;
  } else if (keyS.isDown) {
    player.y += gameState.playerSpeed;
  }

  const angle = Phaser.Math.Angle.Between(
    player.x,
    player.y,
    this.input.activePointer.x,
    this.input.activePointer.y
  );
  player.rotation = angle;
}

function handleBulletBounds() {
  bullets.children.entries.forEach((bullet) => {
    if (
      !Phaser.Geom.Rectangle.Overlaps(
        this.physics.world.bounds,
        bullet.getBounds()
      )
    ) {
      bullet.destroy();
    }
  });
}

function handleEnemyMovement() {
  enemies.children.entries.forEach((enemy) => {
    if (enemy.active) {
      this.physics.moveToObject(enemy, player, 100);
    }
    if (enemy.healthText) {
      enemy.healthText.setPosition(enemy.x, enemy.y - 20);
    }
  });
}

function updateHealthBar() {
  this.healthBarFill.clear();
  this.healthBarFill.fillStyle(0x00ff00, 1);
  this.healthBarFill.fillRect(
    10,
    config.height - 20,
    (player.health / gameState.playerMaxHealth) * 200,
    10
  );
}

function updateCurrencyText() {
  this.currencyText.setText("Currency: " + gameState.currency);
}

function shoot() {
  const bulletSpacing = 10;
  const bulletOffsets = [];

  for (let i = 0; i < gameState.bulletCountLevel; i++) {
    const offset = (i - (gameState.bulletCountLevel - 1) / 2) * bulletSpacing;
    bulletOffsets.push({ x: 0, y: offset });
  }

  bulletOffsets.forEach((offset) => {
    const bullet = bullets.create(player.x, player.y, "bullet");
    bullet.rotation = player.rotation;
    bullet.damage = gameState.playerBaseDamage;

    const bulletX =
      player.x +
      offset.x * Math.cos(player.rotation) -
      offset.y * Math.sin(player.rotation);
    const bulletY =
      player.y +
      offset.x * Math.sin(player.rotation) +
      offset.y * Math.cos(player.rotation);

    bullet.x = bulletX;
    bullet.y = bulletY;

    const bulletAngle = Math.atan2(
      this.input.activePointer.y - bullet.y,
      this.input.activePointer.x - bullet.x
    );
    this.physics.velocityFromRotation(bulletAngle, 500, bullet.body.velocity);
  });
}

function spawnEnemy(isBoss = false) {
  let x, y;
  let enemy;

  if (isBoss) {
    x = config.width / 2;
    y = config.height / 2;
    enemy = this.physics.add.sprite(x, y, "boss");
    enemy.health = 200;
    enemy.body.setSize(80, 80);
    enemy.healthText = this.add.text(enemy.x, enemy.y - 40, enemy.health, {
      fontSize: "20px",
      fill: "#fff",
    });
  } else {
    const edge = Phaser.Math.Between(0, 3);
    if (edge === 0) {
      x = Phaser.Math.Between(0, config.width);
      y = 0;
    } else if (edge === 1) {
      x = config.width;
      y = Phaser.Math.Between(0, config.height);
    } else if (edge === 2) {
      x = Phaser.Math.Between(0, config.width);
      y = config.height;
    } else {
      x = 0;
      y = Phaser.Math.Between(0, config.height);
    }
    enemy = this.physics.add.sprite(x, y, "enemy");
    enemy.health = gameState.enemyBaseHealth;
    enemy.healthText = this.add.text(enemy.x, enemy.y - 20, enemy.health, {
      fontSize: "12px",
      fill: "#fff",
    });
  }

  enemy.setCollideWorldBounds(true);
  enemy.isBoss = isBoss;
  enemies.add(enemy);

  this.physics.add.collider(bullets, enemy, bulletHitEnemy, null, this);
}

function increaseDifficulty() {
  gameState.enemySpawnInterval = Math.max(
    gameState.enemySpawnInterval - 100,
    100
  );
  gameState.enemyBaseHealth += 10;
}

function bulletHitEnemy(bullet, enemy) {
  bullet.destroy();
  enemy.health -= bullet.damage;

  if (enemy.health <= 0) {
    if (enemy.isBoss) {
      gameState.currency += 1000;
      enemy.healthText.destroy();
      enemy.destroy();
      boss = null;
    } else {
      gameState.currency += 10;
      enemy.healthText.destroy();
      enemy.destroy();
      defeatedEnemies++;

      if (defeatedEnemies % 25 == 0) {
        spawnEnemy.call(this, true);
      }
    }
  } else {
    if (enemy.healthText) enemy.healthText.setText(enemy.health);
  }
}

function collectHealthPickup(player, healthPickup) {
  healthPickup.destroy();
  player.health = Math.min(
    player.health + healthPickup.health,
    gameState.playerMaxHealth
  );
}

function playerHitEnemy(player, enemy) {
  if (enemy === boss) {
    player.health -= 40;
  } else {
    enemy.healthText.destroy();
    enemy.destroy();
    player.health -= 10;
  }

  if (player.health <= 0) {
    this.physics.pause();
    this.enemySpawner.paused = true;
    this.restartButton.setVisible(true);
  }
}

function restartGame() {
  player.health = gameState.playerMaxHealth;
  enemies.clear(true, true);
  bullets.clear(true, true);
  defeatedEnemies = 0;

  if (boss) {
    boss.healthText.destroy();
    boss.destroy();
    boss = null;
  }
  this.physics.resume();
  this.enemySpawner.paused = false;

  this.restartButton.setVisible(false);

  this.scene.restart();
}

function upgradeDamage() {
  if (gameState.currency >= gameState.playerDamageCost) {
    gameState.currency -= gameState.playerDamageCost;
    gameState.playerBaseDamage += 10;
    gameState.playerDamageLevel++;
    gameState.playerDamageCost += 50;
    this.damageText.setText(
      `Damage: ${gameState.playerBaseDamage} (Level ${gameState.playerDamageLevel}) Cost: ${gameState.playerDamageCost}`
    );
  }
}

function upgradeShootingRate() {
  if (gameState.currency >= gameState.shootingRateCost) {
    gameState.currency -= gameState.shootingRateCost;
    gameState.shootingRate -=
      parseInt(gameState.shootingRate / 10) * gameState.shootingRateLevel;
    gameState.shootingRateLevel++;
    gameState.shootingRateCost += 50;
    this.shootingRateText.setText(
      `Shooting Rate: ${gameState.shootingRate} (Level ${gameState.shootingRateLevel}) Cost: ${gameState.shootingRateCost}`
    );

    this.shooter.delay = gameState.shootingRate;
  }
}

function upgradeMaxHealth() {
  if (gameState.currency >= gameState.playerHealthCost) {
    gameState.currency -= gameState.playerHealthCost;
    gameState.playerMaxHealth += 20;
    gameState.playerHealthLevel++;
    gameState.playerHealthCost += 50;
    this.healthText.setText(
      `Max Health: ${gameState.playerMaxHealth} (Level ${gameState.playerHealthLevel}) Cost: ${gameState.playerHealthCost}`
    );
  }
}

function upgradeBulletCount() {
  if (gameState.currency >= gameState.bulletCountCost) {
    gameState.currency -= gameState.bulletCountCost;
    gameState.bulletCountLevel++;
    gameState.bulletCountCost += 100;
    this.bulletCountText.setText(
      `Bullet Count: ${gameState.bulletCountLevel} Cost: ${gameState.bulletCountCost}`
    );
  }
}
