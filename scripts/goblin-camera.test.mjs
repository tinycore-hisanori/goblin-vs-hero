import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraMovement,followCamera} from '../src/goblin-camera.js';
test('movement follows camera heading without changing joystick strength',()=>{for(const yaw of [0,.35,Math.PI/2,Math.PI,-Math.PI/2]){const m=cameraMovement(.3,-.4,yaw);assert(Math.abs(Math.hypot(m.dx,m.dz)-.5)<1e-10);}assert.deepEqual(cameraMovement(0,-1,0),{dx:0,dz:-1});const west=cameraMovement(0,-1,Math.PI/2);assert(Math.abs(west.dx+1)<1e-10);assert(Math.abs(west.dz)<1e-10);});
test('camera stays above and behind the followed position',()=>{const p={x:4,y:1,z:8},c=followCamera(p,0);assert.equal(c.x,p.x);assert(c.z>p.z&&c.y>p.y);const turned=followCamera(p,Math.PI/2);assert(turned.x>p.x);assert(Math.abs(turned.z-p.z)<1e-10);});
