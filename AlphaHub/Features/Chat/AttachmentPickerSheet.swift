import SwiftUI
import PhotosUI
import UniformTypeIdentifiers
import UIKit

// MARK: - AttachmentData

/// Encapsulates a selected file (image or PDF) ready for upload.
struct AttachmentData: Sendable {
    let fileName: String
    let fileData: Data
    let mimeType: String
}

// MARK: - Option Row View

/// Reusable row for attachment picker options.
private struct AttachmentOptionRow: View {
    let icon: String
    let title: String
    let subtitle: String

    var body: some View {
        HStack(spacing: AppSpacing.md) {
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(AppColors.surfaceElevated)
                    .frame(width: 48, height: 48)

                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundColor(AppColors.accent)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(AppTypography.bodyLarge)
                    .foregroundColor(AppColors.textPrimary)

                Text(subtitle)
                    .font(AppTypography.caption)
                    .foregroundColor(AppColors.textSecondary)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(AppColors.textTertiary)
        }
        .padding(AppSpacing.md)
        .background(AppColors.surfaceElevated)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color.white.opacity(0.05), lineWidth: 1)
        )
    }
}

// MARK: - AttachmentPickerSheet

/// Bottom sheet presenting three attachment options: Photo Library, Camera, and File (PDF).
struct AttachmentPickerSheet: View {
    var onAttachmentSelected: (AttachmentData) -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var showCamera = false
    @State private var showFilePicker = false

    var body: some View {
        NavigationStack {
            VStack(spacing: AppSpacing.md) {
                // Photo Library
                PhotosPicker(
                    selection: $selectedPhotoItem,
                    matching: .images,
                    photoLibrary: .shared()
                ) {
                    AttachmentOptionRow(
                        icon: "photo.on.rectangle",
                        title: "Photo Library",
                        subtitle: "Choose from your photos"
                    )
                }
                .onChange(of: selectedPhotoItem) { _, newItem in
                    guard let newItem else { return }
                    Task {
                        await handlePhotoSelection(newItem)
                    }
                }

                // Camera (only if available)
                if UIImagePickerController.isSourceTypeAvailable(.camera) {
                    Button {
                        showCamera = true
                    } label: {
                        AttachmentOptionRow(
                            icon: "camera.fill",
                            title: "Camera",
                            subtitle: "Take a new photo"
                        )
                    }
                }

                // File (PDF)
                Button {
                    showFilePicker = true
                } label: {
                    AttachmentOptionRow(
                        icon: "doc.fill",
                        title: "Choose File",
                        subtitle: "Send a PDF document"
                    )
                }

                Spacer()
            }
            .padding(.top, AppSpacing.lg)
            .padding(.horizontal, AppSpacing.md)
            .background(AppColors.surface)
            .navigationTitle("Add Attachment")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundColor(AppColors.textSecondary)
                }
            }
            .fullScreenCover(isPresented: $showCamera) {
                CameraPickerView { image in
                    handleCameraCapture(image)
                }
                .ignoresSafeArea()
            }
            .fileImporter(
                isPresented: $showFilePicker,
                allowedContentTypes: [UTType.pdf],
                allowsMultipleSelection: false
            ) { result in
                handleFileSelection(result)
            }
        }
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
    }

    // MARK: - Handlers

    private func handlePhotoSelection(_ item: PhotosPickerItem) async {
        guard let data = try? await item.loadTransferable(type: Data.self) else { return }

        // Convert to JPEG (normalizes HEIC and other formats)
        guard let uiImage = UIImage(data: data),
              let jpegData = uiImage.jpegData(compressionQuality: 0.8) else { return }

        let attachment = AttachmentData(
            fileName: "photo.jpg",
            fileData: jpegData,
            mimeType: "image/jpeg"
        )

        await MainActor.run {
            onAttachmentSelected(attachment)
            dismiss()
        }
    }

    private func handleCameraCapture(_ image: UIImage) {
        guard let jpegData = image.jpegData(compressionQuality: 0.8) else { return }

        let attachment = AttachmentData(
            fileName: "camera_photo.jpg",
            fileData: jpegData,
            mimeType: "image/jpeg"
        )

        onAttachmentSelected(attachment)
        dismiss()
    }

    private func handleFileSelection(_ result: Result<[URL], Error>) {
        guard case .success(let urls) = result, let url = urls.first else { return }

        // Start accessing the security-scoped resource
        guard url.startAccessingSecurityScopedResource() else { return }
        defer { url.stopAccessingSecurityScopedResource() }

        guard let data = try? Data(contentsOf: url) else { return }

        let attachment = AttachmentData(
            fileName: url.lastPathComponent,
            fileData: data,
            mimeType: "application/pdf"
        )

        onAttachmentSelected(attachment)
        dismiss()
    }
}

// MARK: - Camera Picker (UIViewControllerRepresentable)

/// Wraps UIImagePickerController for camera capture.
struct CameraPickerView: UIViewControllerRepresentable {
    var onCapture: (UIImage) -> Void
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(onCapture: onCapture, dismiss: dismiss)
    }

    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let onCapture: (UIImage) -> Void
        let dismiss: DismissAction

        init(onCapture: @escaping (UIImage) -> Void, dismiss: DismissAction) {
            self.onCapture = onCapture
            self.dismiss = dismiss
        }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let image = info[.originalImage] as? UIImage {
                onCapture(image)
            }
            dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            dismiss()
        }
    }
}
