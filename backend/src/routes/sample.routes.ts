import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { UserRole } from '../models';
import { SampleController } from '../controllers/sample.controller';

const router = Router({ mergeParams: true });

// Require authentication for all sample endpoints
router.use(requireAuth);

/**
 * @route   POST /api/inspections/:inspectionId/samples
 * @desc    Add next sequential sample to the inspection
 * @access  Private (Inspector only; Assistant Controller gets 403)
 */
router.post('/', requireRole(UserRole.INSPECTOR), SampleController.createSample);

/**
 * @route   GET /api/inspections/:inspectionId/samples
 * @desc    List all child samples and progress telemetry for an inspection
 * @access  Private (Owner Inspector or Assistant Controller)
 */
router.get('/', SampleController.listSamples);

/**
 * @route   GET /api/inspections/:inspectionId/samples/:sampleId
 * @desc    Get single sample details by ID or sampleCode
 * @access  Private (Owner Inspector or Assistant Controller)
 */
router.get('/:sampleId', SampleController.getSampleById);

/**
 * @route   PATCH /api/inspections/:inspectionId/samples/:sampleId
 * @desc    Update sample notes or technical lifecycle status
 * @access  Private (Owner Inspector only; Assistant Controller gets 403)
 */
router.patch('/:sampleId', requireRole(UserRole.INSPECTOR), SampleController.updateSample);

/**
 * @route   POST /api/inspections/:inspectionId/samples/:sampleId/images
 * @desc    Upload and attach a package photo to a sample
 * @access  Private (Inspector only; Assistant Controller gets 403)
 */
router.post('/:sampleId/images', requireRole(UserRole.INSPECTOR), SampleController.uploadImage);

/**
 * @route   GET /api/inspections/:inspectionId/samples/:sampleId/images
 * @desc    List attached image metadata for a sample
 * @access  Private (Owner Inspector or Assistant Controller)
 */
router.get('/:sampleId/images', SampleController.getImages);

/**
 * @route   GET /api/inspections/:inspectionId/samples/:sampleId/images/:imageId
 * @desc    Stream temporary image binary with private cache headers
 * @access  Private (Owner Inspector or Assistant Controller)
 */
router.get('/:sampleId/images/:imageId', SampleController.streamImage);

/**
 * @route   DELETE /api/inspections/:inspectionId/samples/:sampleId/images/:imageId
 * @desc    Delete a package image and purge temporary physical file
 * @access  Private (Inspector only; Assistant Controller gets 403)
 */
router.delete('/:sampleId/images/:imageId', requireRole(UserRole.INSPECTOR), SampleController.deleteImage);

export default router;

