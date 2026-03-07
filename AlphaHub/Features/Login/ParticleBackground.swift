import SwiftUI
import SpriteKit

struct ParticleBackground: View {
    var body: some View {
        GeometryReader { geometry in
            SpriteView(
                scene: DataFlowScene(size: geometry.size),
                options: [.allowsTransparency]
            )
            .allowsHitTesting(false)
            .ignoresSafeArea()
        }
    }
}

final class DataFlowScene: SKScene, @unchecked Sendable {
    override func didMove(to view: SKView) {
        backgroundColor = .clear

        let emitter = SKEmitterNode()
        emitter.particleBirthRate = 25
        emitter.particleLifetime = 10
        emitter.particleLifetimeRange = 4
        emitter.particleColor = UIColor(red: 196/255, green: 30/255, blue: 58/255, alpha: 1.0)
        emitter.particleAlpha = 0.15
        emitter.particleAlphaRange = 0.10
        emitter.particleAlphaSpeed = -0.015
        emitter.particleSize = CGSize(width: 3, height: 3)
        emitter.particleScaleRange = 0.5
        emitter.particleSpeed = 15
        emitter.particleSpeedRange = 8
        emitter.emissionAngle = .pi / 2      // upward
        emitter.emissionAngleRange = .pi / 4  // spread
        emitter.particleBlendMode = .add

        // Position at bottom of screen, spanning full width
        emitter.position = CGPoint(x: size.width / 2, y: 0)
        emitter.particlePositionRange = CGVector(dx: size.width, dy: 0)

        addChild(emitter)
    }
}
